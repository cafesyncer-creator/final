-- ==============================================================================
-- CafeSync: Fix Auth Users NULL Tokens & Identities (Resolves 500 "Database error querying schema")
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FIX EXISTING AUTH USERS: Replace NULL tokens with empty strings
-- ------------------------------------------------------------------------------
UPDATE auth.users
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    reauthentication_token = COALESCE(reauthentication_token, '')
WHERE 
    confirmation_token IS NULL 
    OR recovery_token IS NULL 
    OR email_change IS NULL 
    OR email_change_token_new IS NULL;

-- ------------------------------------------------------------------------------
-- 2. ENSURE ALL AUTH USERS HAVE MATCHING AUTH.IDENTITIES
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id'
    ) THEN
        EXECUTE '
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
            )
            SELECT 
                u.id::text, 
                u.id, 
                jsonb_build_object(''sub'', u.id::text, ''email'', u.email), 
                ''email'', 
                u.id::text, 
                now(), 
                now(), 
                now()
            FROM auth.users u
            WHERE NOT EXISTS (
                SELECT 1 FROM auth.identities i 
                WHERE i.user_id = u.id AND i.provider = ''email''
            )
            ON CONFLICT (id, provider) DO NOTHING;
        ';
    ELSE
        EXECUTE '
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
            )
            SELECT 
                u.id::text, 
                u.id, 
                jsonb_build_object(''sub'', u.id::text, ''email'', u.email), 
                ''email'', 
                now(), 
                now(), 
                now()
            FROM auth.users u
            WHERE NOT EXISTS (
                SELECT 1 FROM auth.identities i 
                WHERE i.user_id = u.id AND i.provider = ''email''
            )
            ON CONFLICT (id, provider) DO NOTHING;
        ';
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. UPDATE rpc_master_create_brand_admin
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_master_create_brand_admin(
    p_brand_id uuid,
    p_name text,
    p_email text,
    p_phone text default null,
    p_password text default 'AdminPass123!'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_caller_role text;
    v_user_id uuid;
    v_encrypted_pw text;
BEGIN
    -- Check caller is master
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_caller_role NOT IN ('master', 'platform_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Platform Master access required.');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Target brand not found.');
    END IF;

    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = lower(trim(p_email));

    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at,
            confirmation_token, recovery_token, email_change, email_change_token_new,
            email_change_token_current, phone_change, phone_change_token, reauthentication_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            lower(trim(p_email)),
            v_encrypted_pw,
            now(),
            jsonb_build_object('provider', 'email', 'providers', array['email']),
            jsonb_build_object('full_name', p_name),
            now(),
            now(),
            '', '', '', '',
            '', '', '', ''
        );
    ELSE
        UPDATE auth.users
        SET encrypted_password = v_encrypted_pw,
            raw_user_meta_data = jsonb_build_object('full_name', p_name),
            confirmation_token = COALESCE(confirmation_token, ''),
            recovery_token = COALESCE(recovery_token, ''),
            email_change = COALESCE(email_change, ''),
            email_change_token_new = COALESCE(email_change_token_new, ''),
            updated_at = now()
        WHERE id = v_user_id;
    END IF;

    -- Ensure matching identity in auth.identities
    BEGIN
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
            v_user_id::text,
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(p_email))),
            'email',
            now(),
            now(),
            now()
        )
        ON CONFLICT (id, provider) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        -- Non-blocking if schema differs
    END;

    INSERT INTO public.profiles (
        id, role, brand_id, full_name, phone, is_active, must_change_password, updated_at
    ) VALUES (
        v_user_id, 'admin', p_brand_id, p_name, p_phone, true, true, now()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        brand_id = p_brand_id,
        full_name = p_name,
        phone = p_phone,
        is_active = true,
        must_change_password = true,
        updated_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', lower(trim(p_email))
    );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_master_create_brand_admin FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_master_create_brand_admin TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. UPDATE rpc_admin_create_shop_with_manager
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_admin_create_shop_with_manager(
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
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
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
BEGIN
    SELECT role, brand_id INTO v_caller_role, v_caller_brand_id
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'brand_admin', 'master', 'platform_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin credentials required.');
    END IF;

    IF v_caller_role IN ('master', 'platform_admin') THEN
        v_target_brand_id := COALESCE(p_brand_id, v_caller_brand_id);
    ELSE
        v_target_brand_id := v_caller_brand_id;
    END IF;

    IF v_target_brand_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Brand ID is required.');
    END IF;

    SELECT slug INTO v_brand_slug
    FROM public.brands
    WHERE id = v_target_brand_id;

    IF v_brand_slug IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Brand not found.');
    END IF;

    v_clean_code := upper(trim(p_code));
    v_clean_username := lower(trim(p_username));

    IF p_name IS NULL OR trim(p_name) = '' OR v_clean_code = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shop name and code are required.');
    END IF;

    IF p_manager_name IS NULL OR trim(p_manager_name) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Manager name is required.');
    END IF;

    IF v_clean_username = '' OR length(v_clean_username) < 2 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Username must be at least 2 characters long.');
    END IF;

    IF length(p_password) < 8 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 8 characters long.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.shops
        WHERE brand_id = v_target_brand_id AND code = v_clean_code
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', format('Shop code "%s" is already in use for this brand.', v_clean_code));
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE brand_id = v_target_brand_id AND lower(username) = v_clean_username
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', format('Username "%s" is already taken in this brand.', v_clean_username));
    END IF;

    v_synthetic_email := format('%s@%s.cafesync.app', v_clean_username, v_brand_slug);

    INSERT INTO public.shops (
        brand_id, name, code, address, phone, status, is_active, created_at, updated_at
    ) VALUES (
        v_target_brand_id, trim(p_name), v_clean_code, nullif(trim(p_address), ''), nullif(trim(p_phone), ''), 'active', true, now(), now()
    ) RETURNING id INTO v_new_shop_id;

    SELECT id INTO v_new_user_id
    FROM auth.users
    WHERE email = v_synthetic_email;

    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    IF v_new_user_id IS NULL THEN
        v_new_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at,
            confirmation_token, recovery_token, email_change, email_change_token_new,
            email_change_token_current, phone_change, phone_change_token, reauthentication_token
        ) VALUES (
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
            now(),
            '', '', '', '',
            '', '', '', ''
        );
    ELSE
        UPDATE auth.users
        SET encrypted_password = v_encrypted_pw,
            raw_user_meta_data = jsonb_build_object('full_name', trim(p_manager_name), 'username', v_clean_username),
            confirmation_token = COALESCE(confirmation_token, ''),
            recovery_token = COALESCE(recovery_token, ''),
            email_change = COALESCE(email_change, ''),
            email_change_token_new = COALESCE(email_change_token_new, ''),
            updated_at = now()
        WHERE id = v_new_user_id;
    END IF;

    BEGIN
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
            v_new_user_id::text,
            v_new_user_id,
            jsonb_build_object('sub', v_new_user_id::text, 'email', v_synthetic_email),
            'email',
            now(),
            now(),
            now()
        )
        ON CONFLICT (id, provider) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
    END;

    INSERT INTO public.profiles (
        id, role, brand_id, shop_id, full_name, username, phone, is_active, must_change_password, updated_at
    ) VALUES (
        v_new_user_id, 'manager', v_target_brand_id, v_new_shop_id, trim(p_manager_name), v_clean_username, nullif(trim(p_manager_phone), ''), true, true, now()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'manager',
        brand_id = v_target_brand_id,
        shop_id = v_new_shop_id,
        full_name = trim(p_manager_name),
        username = v_clean_username,
        phone = nullif(trim(p_manager_phone), ''),
        is_active = true,
        must_change_password = true,
        updated_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'shop', jsonb_build_object(
            'id', v_new_shop_id,
            'name', trim(p_name),
            'code', v_clean_code,
            'status', 'active'
        ),
        'manager', jsonb_build_object(
            'id', v_new_user_id,
            'fullName', trim(p_manager_name),
            'username', v_clean_username,
            'loginPath', format('/login/%s', v_brand_slug)
        )
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. UPDATE rpc_admin_create_manager_user
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_admin_create_manager_user(
    p_shop_id uuid,
    p_full_name text,
    p_username text,
    p_password text,
    p_phone text default null,
    p_email text default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_caller_role text;
    v_caller_brand_id uuid;
    v_shop record;
    v_clean_username text;
    v_resolved_email text;
    v_new_user_id uuid;
    v_encrypted_pw text;
BEGIN
    SELECT role, brand_id INTO v_caller_role, v_caller_brand_id
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'brand_admin', 'master', 'platform_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin credentials required.');
    END IF;

    SELECT s.*, b.slug as brand_slug INTO v_shop
    FROM public.shops s
    JOIN public.brands b ON b.id = s.brand_id
    WHERE s.id = p_shop_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Assigned shop not found.');
    END IF;

    IF v_caller_role NOT IN ('master', 'platform_admin') AND v_shop.brand_id != v_caller_brand_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Shop belongs to another brand.');
    END IF;

    v_clean_username := lower(trim(p_username));
    IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Manager name is required.');
    END IF;

    IF v_clean_username = '' OR length(v_clean_username) < 2 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Username must be at least 2 characters long.');
    END IF;

    IF length(p_password) < 8 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 8 characters long.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE brand_id = v_shop.brand_id AND lower(username) = v_clean_username
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', format('Username "%s" is already taken in this brand.', v_clean_username));
    END IF;

    IF p_email IS NOT NULL AND trim(p_email) != '' THEN
        v_resolved_email := lower(trim(p_email));
    ELSE
        v_resolved_email := format('%s@%s.cafesync.app', v_clean_username, v_shop.brand_slug);
    END IF;

    SELECT id INTO v_new_user_id
    FROM auth.users
    WHERE email = v_resolved_email;

    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    IF v_new_user_id IS NULL THEN
        v_new_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at,
            confirmation_token, recovery_token, email_change, email_change_token_new,
            email_change_token_current, phone_change, phone_change_token, reauthentication_token
        ) VALUES (
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
            now(),
            '', '', '', '',
            '', '', '', ''
        );
    ELSE
        UPDATE auth.users
        SET encrypted_password = v_encrypted_pw,
            raw_user_meta_data = jsonb_build_object('full_name', trim(p_full_name), 'username', v_clean_username),
            confirmation_token = COALESCE(confirmation_token, ''),
            recovery_token = COALESCE(recovery_token, ''),
            email_change = COALESCE(email_change, ''),
            email_change_token_new = COALESCE(email_change_token_new, ''),
            updated_at = now()
        WHERE id = v_new_user_id;
    END IF;

    BEGIN
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
            v_new_user_id::text,
            v_new_user_id,
            jsonb_build_object('sub', v_new_user_id::text, 'email', v_resolved_email),
            'email',
            now(),
            now(),
            now()
        )
        ON CONFLICT (id, provider) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
    END;

    INSERT INTO public.profiles (
        id, role, brand_id, shop_id, full_name, username, phone, is_active, must_change_password, updated_at
    ) VALUES (
        v_new_user_id, 'manager', v_shop.brand_id, p_shop_id, trim(p_full_name), v_clean_username, nullif(trim(p_phone), ''), true, true, now()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'manager',
        brand_id = v_shop.brand_id,
        shop_id = p_shop_id,
        full_name = trim(p_full_name),
        username = v_clean_username,
        phone = nullif(trim(p_phone), ''),
        is_active = true,
        must_change_password = true,
        updated_at = now();

    RETURN jsonb_build_object(
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
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. UPDATE rpc_admin_reset_manager_password
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_admin_reset_manager_password(
    p_user_id uuid,
    p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_caller_role text;
    v_caller_brand_id uuid;
    v_target_profile record;
    v_brand_slug text;
    v_shop_name text := 'Assigned Shop';
    v_shop_code text := 'SHOP';
    v_encrypted_pw text;
BEGIN
    SELECT role, brand_id INTO v_caller_role, v_caller_brand_id
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'brand_admin', 'master', 'platform_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin credentials required.');
    END IF;

    IF length(p_password) < 8 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 8 characters long.');
    END IF;

    SELECT p.*, b.slug as brand_slug INTO v_target_profile
    FROM public.profiles p
    LEFT JOIN public.brands b ON b.id = p.brand_id
    WHERE p.id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Target user account not found.');
    END IF;

    IF v_caller_role NOT IN ('master', 'platform_admin') AND v_target_profile.brand_id != v_caller_brand_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: User belongs to another brand.');
    END IF;

    IF v_target_profile.shop_id IS NOT NULL THEN
        SELECT name, code INTO v_shop_name, v_shop_code
        FROM public.shops
        WHERE id = v_target_profile.shop_id;
    END IF;

    v_brand_slug := COALESCE(v_target_profile.brand_slug, 'brand');
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- Update auth password AND sanitize token columns to prevent "Database error querying schema"
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change = COALESCE(email_change, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        updated_at = now()
    WHERE id = p_user_id;

    -- Ensure matching identity exists
    BEGIN
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        )
        SELECT 
            u.id::text,
            u.id,
            jsonb_build_object('sub', u.id::text, 'email', u.email),
            'email',
            now(),
            now(),
            now()
        FROM auth.users u
        WHERE u.id = p_user_id
        ON CONFLICT (id, provider) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
    END;

    UPDATE public.profiles
    SET must_change_password = true,
        updated_at = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'credentials', jsonb_build_object(
            'temporaryPassword', p_password,
            'username', COALESCE(v_target_profile.username, ''),
            'fullName', COALESCE(v_target_profile.full_name, 'Shop Manager'),
            'shopName', v_shop_name,
            'shopCode', v_shop_code,
            'loginPath', format('/login/%s', v_brand_slug)
        )
    );
END;
$$;
