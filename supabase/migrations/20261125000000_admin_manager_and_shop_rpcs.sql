-- ==============================================================================
-- CafeSync: Admin Manager & Shop Management RPC Migration (Zero Edge Function)
-- Provides atomic, zero-edge-function procedures for Brand Admins to:
-- 1. rpc_admin_create_shop_with_manager
-- 2. rpc_admin_create_manager_user
-- 3. rpc_admin_reset_manager_password
-- 4. rpc_admin_delete_shop
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RPC: CREATE SHOP WITH MANAGER (ATOMIC)
-- ------------------------------------------------------------------------------
create or replace function public.rpc_admin_create_shop_with_manager(
    p_name text,
    p_code text,
    p_manager_name text,
    p_username text,
    p_password text,
    p_address text default null,
    p_phone text default null,
    p_manager_phone text default null,
    p_brand_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
    v_caller_id uuid := auth.uid();
    v_caller_role text;
    v_caller_brand_id uuid;
    v_target_brand_id uuid;
    v_brand_slug text;
    v_clean_username text;
    v_clean_code text;
    v_synthetic_email text;
    v_new_shop_id uuid;
    v_new_user_id uuid;
    v_encrypted_pw text;
begin
    -- 1. Verify caller
    select role, brand_id into v_caller_role, v_caller_brand_id
    from public.profiles
    where id = v_caller_id;

    if v_caller_role is null or v_caller_role not in ('admin', 'brand_admin', 'master', 'platform_admin') then
        return jsonb_build_object('success', false, 'error', 'Unauthorized: Admin credentials required.');
    end if;

    if v_caller_role in ('master', 'platform_admin') then
        v_target_brand_id := coalesce(p_brand_id, v_caller_brand_id);
    else
        v_target_brand_id := v_caller_brand_id;
    end if;

    if v_target_brand_id is null then
        return jsonb_build_object('success', false, 'error', 'Brand ID is required.');
    end if;

    -- 2. Verify brand exists & get slug
    select slug into v_brand_slug
    from public.brands
    where id = v_target_brand_id;

    if v_brand_slug is null then
        return jsonb_build_object('success', false, 'error', 'Brand not found.');
    end if;

    -- 3. Validate inputs
    v_clean_code := upper(trim(p_code));
    v_clean_username := lower(trim(p_username));

    if p_name is null or trim(p_name) = '' or v_clean_code = '' then
        return jsonb_build_object('success', false, 'error', 'Shop name and code are required.');
    end if;

    if p_manager_name is null or trim(p_manager_name) = '' then
        return jsonb_build_object('success', false, 'error', 'Manager name is required.');
    end if;

    if v_clean_username = '' or length(v_clean_username) < 2 then
        return jsonb_build_object('success', false, 'error', 'Username must be at least 2 characters long.');
    end if;

    if length(p_password) < 8 then
        return jsonb_build_object('success', false, 'error', 'Password must be at least 8 characters long.');
    end if;

    -- 4. Check uniqueness of shop code within brand
    if exists (
        select 1 from public.shops
        where brand_id = v_target_brand_id and code = v_clean_code
    ) then
        return jsonb_build_object('success', false, 'error', format('Shop code "%s" is already in use for this brand.', v_clean_code));
    end if;

    -- 5. Check uniqueness of username within brand
    if exists (
        select 1 from public.profiles
        where brand_id = v_target_brand_id and lower(username) = v_clean_username
    ) then
        return jsonb_build_object('success', false, 'error', format('Username "%s" is already taken in this brand.', v_clean_username));
    end if;

    -- 6. Insert Shop
    insert into public.shops (
        brand_id, name, code, address, phone, status
    ) values (
        v_target_brand_id, trim(p_name), v_clean_code, nullif(trim(p_address), ''), nullif(trim(p_phone), ''), 'active'
    )
    returning id into v_new_shop_id;

    -- 7. Build synthetic email
    v_synthetic_email := format('%s@%s.cafesync.app', v_clean_username, v_brand_slug);

    -- 8. Create or update Auth User
    select id into v_new_user_id
    from auth.users
    where email = v_synthetic_email;

    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    if v_new_user_id is null then
        v_new_user_id := gen_random_uuid();
        insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
        ) values (
            '00000000-0000-0000-0000-000000000000',
            v_new_user_id,
            'authenticated',
            'authenticated',
            v_synthetic_email,
            v_encrypted_pw,
            now(),
            jsonb_build_object('provider', 'email', 'providers', array['email']),
            jsonb_build_object('full_name', trim(p_manager_name), 'username', v_clean_username),
            now(),
            now()
        );
    else
        update auth.users
        set encrypted_password = v_encrypted_pw,
            raw_user_meta_data = jsonb_build_object('full_name', trim(p_manager_name), 'username', v_clean_username),
            updated_at = now()
        where id = v_new_user_id;
    end if;

    -- 9. Create or update Profile
    insert into public.profiles (
        id, role, brand_id, shop_id, full_name, username, phone, is_active, must_change_password, updated_at
    ) values (
        v_new_user_id, 'manager', v_target_brand_id, v_new_shop_id, trim(p_manager_name), v_clean_username, nullif(trim(p_manager_phone), ''), true, true, now()
    )
    on conflict (id) do update set
        role = 'manager',
        brand_id = v_target_brand_id,
        shop_id = v_new_shop_id,
        full_name = trim(p_manager_name),
        username = v_clean_username,
        phone = nullif(trim(p_manager_phone), ''),
        is_active = true,
        must_change_password = true,
        updated_at = now();

    return jsonb_build_object(
        'success', true,
        'shop', jsonb_build_object(
            'id', v_new_shop_id,
            'brand_id', v_target_brand_id,
            'name', trim(p_name),
            'code', v_clean_code,
            'address', nullif(trim(p_address), ''),
            'phone', nullif(trim(p_phone), ''),
            'status', 'active'
        ),
        'credentials', jsonb_build_object(
            'shopName', trim(p_name),
            'shopCode', v_clean_code,
            'managerName', trim(p_manager_name),
            'loginPath', format('/login/%s', v_brand_slug),
            'username', v_clean_username,
            'password', p_password
        )
    );
end;
$$;

-- ------------------------------------------------------------------------------
-- 2. RPC: CREATE MANAGER USER (ATOMIC)
-- ------------------------------------------------------------------------------
create or replace function public.rpc_admin_create_manager_user(
    p_shop_id uuid,
    p_full_name text,
    p_username text,
    p_password text,
    p_phone text default null,
    p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
    v_caller_id uuid := auth.uid();
    v_caller_role text;
    v_caller_brand_id uuid;
    v_shop record;
    v_clean_username text;
    v_resolved_email text;
    v_new_user_id uuid;
    v_encrypted_pw text;
begin
    -- 1. Verify caller
    select role, brand_id into v_caller_role, v_caller_brand_id
    from public.profiles
    where id = v_caller_id;

    if v_caller_role is null or v_caller_role not in ('admin', 'brand_admin', 'master', 'platform_admin') then
        return jsonb_build_object('success', false, 'error', 'Unauthorized: Admin credentials required.');
    end if;

    -- 2. Verify shop exists & belongs to brand
    select s.*, b.slug as brand_slug into v_shop
    from public.shops s
    join public.brands b on b.id = s.brand_id
    where s.id = p_shop_id;

    if not found then
        return jsonb_build_object('success', false, 'error', 'Assigned shop not found.');
    end if;

    if v_caller_role not in ('master', 'platform_admin') and v_shop.brand_id != v_caller_brand_id then
        return jsonb_build_object('success', false, 'error', 'Unauthorized: Shop belongs to another brand.');
    end if;

    -- 3. Validate inputs
    v_clean_username := lower(trim(p_username));
    if p_full_name is null or trim(p_full_name) = '' then
        return jsonb_build_object('success', false, 'error', 'Manager name is required.');
    end if;

    if v_clean_username = '' or length(v_clean_username) < 2 then
        return jsonb_build_object('success', false, 'error', 'Username must be at least 2 characters long.');
    end if;

    if length(p_password) < 8 then
        return jsonb_build_object('success', false, 'error', 'Password must be at least 8 characters long.');
    end if;

    -- 4. Check username uniqueness within brand
    if exists (
        select 1 from public.profiles
        where brand_id = v_shop.brand_id and lower(username) = v_clean_username
    ) then
        return jsonb_build_object('success', false, 'error', format('Username "%s" is already taken in this brand.', v_clean_username));
    end if;

    -- 5. Resolve email
    if p_email is not null and trim(p_email) != '' then
        v_resolved_email := lower(trim(p_email));
    else
        v_resolved_email := format('%s@%s.cafesync.app', v_clean_username, v_shop.brand_slug);
    end if;

    -- 6. Create or update auth user
    select id into v_new_user_id
    from auth.users
    where email = v_resolved_email;

    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    if v_new_user_id is null then
        v_new_user_id := gen_random_uuid();
        insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
        ) values (
            '00000000-0000-0000-0000-000000000000',
            v_new_user_id,
            'authenticated',
            'authenticated',
            v_resolved_email,
            v_encrypted_pw,
            now(),
            jsonb_build_object('provider', 'email', 'providers', array['email']),
            jsonb_build_object('full_name', trim(p_full_name), 'username', v_clean_username),
            now(),
            now()
        );
    else
        update auth.users
        set encrypted_password = v_encrypted_pw,
            raw_user_meta_data = jsonb_build_object('full_name', trim(p_full_name), 'username', v_clean_username),
            updated_at = now()
        where id = v_new_user_id;
    end if;

    -- 7. Insert or update profile
    insert into public.profiles (
        id, role, brand_id, shop_id, full_name, username, phone, is_active, must_change_password, updated_at
    ) values (
        v_new_user_id, 'manager', v_shop.brand_id, p_shop_id, trim(p_full_name), v_clean_username, nullif(trim(p_phone), ''), true, true, now()
    )
    on conflict (id) do update set
        role = 'manager',
        brand_id = v_shop.brand_id,
        shop_id = p_shop_id,
        full_name = trim(p_full_name),
        username = v_clean_username,
        phone = nullif(trim(p_phone), ''),
        is_active = true,
        must_change_password = true,
        updated_at = now();

    return jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
            'id', v_new_user_id,
            'fullName', trim(p_full_name),
            'username', v_clean_username,
            'phone', nullif(trim(p_phone), ''),
            'shopId', p_shop_id,
            'isActive', true
        ),
        'credentials', jsonb_build_object(
            'shopName', v_shop.name,
            'shopCode', v_shop.code,
            'managerName', trim(p_full_name),
            'loginPath', format('/login/%s', v_shop.brand_slug),
            'username', v_clean_username,
            'password', p_password
        )
    );
end;
$$;

-- ------------------------------------------------------------------------------
-- 3. RPC: RESET MANAGER PASSWORD (ATOMIC)
-- ------------------------------------------------------------------------------
create or replace function public.rpc_admin_reset_manager_password(
    p_user_id uuid,
    p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
    v_caller_id uuid := auth.uid();
    v_caller_role text;
    v_caller_brand_id uuid;
    v_target_profile record;
    v_brand_slug text;
    v_shop_name text := 'Assigned Shop';
    v_shop_code text := 'SHOP';
    v_encrypted_pw text;
begin
    -- 1. Verify caller
    select role, brand_id into v_caller_role, v_caller_brand_id
    from public.profiles
    where id = v_caller_id;

    if v_caller_role is null or v_caller_role not in ('admin', 'brand_admin', 'master', 'platform_admin') then
        return jsonb_build_object('success', false, 'error', 'Unauthorized: Admin credentials required.');
    end if;

    if length(p_password) < 8 then
        return jsonb_build_object('success', false, 'error', 'Password must be at least 8 characters long.');
    end if;

    -- 2. Verify target user
    select p.*, b.slug as brand_slug into v_target_profile
    from public.profiles p
    left join public.brands b on b.id = p.brand_id
    where p.id = p_user_id;

    if not found then
        return jsonb_build_object('success', false, 'error', 'Target user account not found.');
    end if;

    if v_caller_role not in ('master', 'platform_admin') and v_target_profile.brand_id != v_caller_brand_id then
        return jsonb_build_object('success', false, 'error', 'Unauthorized: User belongs to another brand.');
    end if;

    -- Resolve shop details if assigned
    if v_target_profile.shop_id is not null then
        select name, code into v_shop_name, v_shop_code
        from public.shops
        where id = v_target_profile.shop_id;
    end if;

    v_brand_slug := coalesce(v_target_profile.brand_slug, 'brand');

    -- 3. Update auth password
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    update auth.users
    set encrypted_password = v_encrypted_pw,
        updated_at = now()
    where id = p_user_id;

    -- 4. Update profile must_change_password
    update public.profiles
    set must_change_password = true,
        updated_at = now()
    where id = p_user_id;

    return jsonb_build_object(
        'success', true,
        'credentials', jsonb_build_object(
            'temporaryPassword', p_password,
            'username', coalesce(v_target_profile.username, ''),
            'fullName', coalesce(v_target_profile.full_name, 'Shop Manager'),
            'shopName', v_shop_name,
            'shopCode', v_shop_code,
            'loginPath', format('/login/%s', v_brand_slug)
        )
    );
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. RPC: DELETE SHOP (SAFE CASCADE, CHECKS ZERO TRANSACTIONS)
-- ------------------------------------------------------------------------------
create or replace function public.rpc_admin_delete_shop(
    p_shop_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
    v_caller_id uuid := auth.uid();
    v_caller_role text;
    v_caller_brand_id uuid;
    v_shop record;
    v_txn_count integer;
    v_managers uuid[];
begin
    -- 1. Verify caller
    select role, brand_id into v_caller_role, v_caller_brand_id
    from public.profiles
    where id = v_caller_id;

    if v_caller_role is null or v_caller_role not in ('admin', 'brand_admin', 'master', 'platform_admin') then
        return jsonb_build_object('success', false, 'error', 'Unauthorized: Admin credentials required.');
    end if;

    -- 2. Verify shop
    select * into v_shop
    from public.shops
    where id = p_shop_id;

    if not found then
        return jsonb_build_object('success', false, 'error', 'Shop not found.');
    end if;

    if v_caller_role not in ('master', 'platform_admin') and v_shop.brand_id != v_caller_brand_id then
        return jsonb_build_object('success', false, 'error', 'Unauthorized: Shop belongs to another brand.');
    end if;

    -- 3. Check for existing transactions
    select count(*) into v_txn_count
    from public.transactions
    where shop_id = p_shop_id and is_deleted = false;

    if v_txn_count > 0 then
        return jsonb_build_object(
            'success', false,
            'error', format('Cannot delete this shop because it already contains %s transaction(s). To preserve ledger integrity and audit history, please deactivate the shop instead.', v_txn_count)
        );
    end if;

    -- 4. Collect manager accounts assigned strictly to this shop
    select array_agg(id) into v_managers
    from public.profiles
    where shop_id = p_shop_id and role in ('manager', 'shop_manager');

    -- 5. Cascade delete shop assets, employees, items, daily summary
    delete from public.salary_records where shop_id = p_shop_id;
    delete from public.transactions where shop_id = p_shop_id;
    delete from public.daily_summary where shop_id = p_shop_id;
    delete from public.month_openings where shop_id = p_shop_id;
    delete from public.asset_service_logs where asset_id in (select id from public.assets where shop_id = p_shop_id);
    delete from public.assets where shop_id = p_shop_id;
    delete from public.employees where shop_id = p_shop_id;
    delete from public.items where shop_id = p_shop_id;

    -- 6. Delete manager profiles and auth users
    delete from public.profiles where shop_id = p_shop_id;

    if v_managers is not null and array_length(v_managers, 1) > 0 then
        delete from auth.users where id = any(v_managers);
    end if;

    -- 7. Delete shop record
    delete from public.shops where id = p_shop_id;

    return jsonb_build_object('success', true);
end;
$$;

-- ------------------------------------------------------------------------------
-- 5. GRANTS & PERMISSIONS
-- ------------------------------------------------------------------------------
revoke all on function public.rpc_admin_create_shop_with_manager from public;
grant execute on function public.rpc_admin_create_shop_with_manager to authenticated, service_role;

revoke all on function public.rpc_admin_create_manager_user from public;
grant execute on function public.rpc_admin_create_manager_user to authenticated, service_role;

revoke all on function public.rpc_admin_reset_manager_password from public;
grant execute on function public.rpc_admin_reset_manager_password to authenticated, service_role;

revoke all on function public.rpc_admin_delete_shop from public;
grant execute on function public.rpc_admin_delete_shop to authenticated, service_role;
