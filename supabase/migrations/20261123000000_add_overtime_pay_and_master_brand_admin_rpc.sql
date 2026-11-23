-- ==============================================================================
-- CafeSync - Migration 20261123000000
-- 1. Add overtime_pay column to salary_records and update salary calculations
-- 2. Add atomic rpc_master_create_brand_admin (zero Edge Function dependency)
-- 3. Fix get_login_email_for_username max(uuid) cast
-- ==============================================================================

-- Ensure pgcrypto extension exists for password hashing
create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------------------------
-- 1. ADD OVERTIME PAY COLUMN
-- ------------------------------------------------------------------------------
alter table public.salary_records
add column if not exists overtime_pay numeric(12,2) not null default 0.00;

-- ------------------------------------------------------------------------------
-- 2. RECALCULATE SALARY RECORD WITH OVERTIME PAY
-- ------------------------------------------------------------------------------
create or replace function public.recalculate_salary_record(
    p_shop_id uuid,
    p_employee_id uuid,
    p_month text -- 'YYYY-MM'
)
returns void as $$
declare
    v_advances numeric(12,2) := 0.00;
    v_paid numeric(12,2) := 0.00;
    v_days numeric(5,1) := 0.0;
    v_rate numeric(10,2) := 0.00;
    v_overtime numeric(12,2) := 0.00;
    v_gross numeric(12,2) := 0.00;
    v_balance numeric(12,2) := 0.00;
begin
    -- Calculate advances in this month
    select coalesce(sum(amount), 0.00)
    into v_advances
    from public.transactions
    where shop_id = p_shop_id
      and employee_id = p_employee_id
      and to_char(txn_date, 'YYYY-MM') = p_month
      and txn_type = 'salary_advance'
      and not is_deleted;

    -- Calculate salary payments in this month
    select coalesce(sum(amount), 0.00)
    into v_paid
    from public.transactions
    where shop_id = p_shop_id
      and employee_id = p_employee_id
      and to_char(txn_date, 'YYYY-MM') = p_month
      and txn_type = 'salary_payment'
      and not is_deleted;

    -- Get employee current rate if record not found
    select rate_per_day into v_rate
    from public.employees
    where id = p_employee_id;
    v_rate := coalesce(v_rate, 0.00);

    -- Check if record exists to keep existing days_worked and overtime_pay
    select days_worked, rate_snapshot, coalesce(overtime_pay, 0.00)
    into v_days, v_rate, v_overtime
    from public.salary_records
    where shop_id = p_shop_id and employee_id = p_employee_id and month = p_month;

    v_days := coalesce(v_days, 0.0);
    v_overtime := coalesce(v_overtime, 0.00);
    v_gross := round((v_days * v_rate) + v_overtime, 2);
    v_balance := v_gross - v_advances - v_paid;

    insert into public.salary_records (
        shop_id, employee_id, month, days_worked, rate_snapshot, overtime_pay, gross, advances_total, paid_total, balance, updated_at
    )
    values (
        p_shop_id, p_employee_id, p_month, v_days, v_rate, v_overtime, v_gross, v_advances, v_paid, v_balance, now()
    )
    on conflict (shop_id, employee_id, month)
    do update set
        advances_total = excluded.advances_total,
        paid_total = excluded.paid_total,
        overtime_pay = coalesce(salary_records.overtime_pay, 0.00),
        gross = round((salary_records.days_worked * salary_records.rate_snapshot) + coalesce(salary_records.overtime_pay, 0.00), 2),
        balance = round((salary_records.days_worked * salary_records.rate_snapshot) + coalesce(salary_records.overtime_pay, 0.00), 2) - excluded.advances_total - excluded.paid_total,
        updated_at = now();
end;
$$ language plpgsql security definer set search_path = public;

-- ------------------------------------------------------------------------------
-- 3. RPC: UPDATE DAYS WORKED & OVERTIME PAY (SHOP COUNTER)
-- ------------------------------------------------------------------------------
create or replace function public.rpc_shop_update_days_worked(
    p_employee_id uuid,
    p_days_worked numeric,
    p_month text,
    p_overtime_pay numeric default null
)
returns jsonb
language plpgsql
security invoker
as $$
declare
    v_user_id uuid := auth.uid();
    v_shop_id uuid := public.auth_shop_id();
    v_is_closed boolean := false;
    v_emp record;
    v_existing record;
    v_rate numeric;
    v_days numeric;
    v_overtime numeric := 0;
    v_gross numeric;
    v_advances numeric := 0;
    v_paid numeric := 0;
    v_balance numeric;
begin
    if v_user_id is null or v_shop_id is null then
        raise exception 'Unauthorized.';
    end if;

    select (closed_at is not null) into v_is_closed
    from public.month_openings
    where shop_id = v_shop_id and month = p_month;

    if v_is_closed then
        raise exception 'Period Locked: Month % is closed.', p_month;
    end if;

    select name, rate_per_day into v_emp
    from public.employees
    where id = p_employee_id and shop_id = v_shop_id;

    if not found then
        raise exception 'Employee not found.';
    end if;

    v_rate := coalesce(v_emp.rate_per_day, 0);

    select days_worked, advances_total, paid_total, coalesce(overtime_pay, 0) as overtime_pay into v_existing
    from public.salary_records
    where shop_id = v_shop_id and employee_id = p_employee_id and month = p_month;

    if found then
        v_advances := coalesce(v_existing.advances_total, 0);
        v_paid := coalesce(v_existing.paid_total, 0);
        v_days := coalesce(p_days_worked, v_existing.days_worked, 0);
        v_overtime := coalesce(p_overtime_pay, v_existing.overtime_pay, 0);
    else
        v_days := coalesce(p_days_worked, 0);
        v_overtime := coalesce(p_overtime_pay, 0);
    end if;

    if v_days < 0 or v_days > 31 then
        raise exception 'Please enter valid days worked between 0 and 31.';
    end if;

    if v_overtime < 0 then
        raise exception 'Overtime pay cannot be negative.';
    end if;

    v_gross := round((v_days * v_rate) + v_overtime, 2);
    v_balance := round(v_gross - v_advances - v_paid, 2);

    insert into public.salary_records (
        shop_id,
        employee_id,
        month,
        days_worked,
        rate_snapshot,
        overtime_pay,
        gross,
        advances_total,
        paid_total,
        balance,
        updated_at
    ) values (
        v_shop_id,
        p_employee_id,
        p_month,
        v_days,
        v_rate,
        v_overtime,
        v_gross,
        v_advances,
        v_paid,
        v_balance,
        now()
    )
    on conflict (shop_id, employee_id, month)
    do update set
        days_worked = excluded.days_worked,
        rate_snapshot = excluded.rate_snapshot,
        overtime_pay = excluded.overtime_pay,
        gross = excluded.gross,
        balance = excluded.balance,
        updated_at = now();

    insert into public.audit_log (user_id, action, table_name, record_id, new_data, at)
    values (
        v_user_id,
        'UPDATE',
        'salary_records',
        p_employee_id::text || '_' || p_month,
        jsonb_build_object(
            'days_worked', v_days,
            'overtime_pay', v_overtime,
            'gross', v_gross,
            'balance', v_balance,
            'month', p_month
        ),
        now()
    );

    return jsonb_build_object(
        'success', true,
        'message', 'Staff attendance & overtime updated.',
        'days_worked', v_days,
        'overtime_pay', v_overtime,
        'gross', v_gross,
        'balance', v_balance
    );
end;
$$;

revoke all on function public.rpc_shop_update_days_worked(uuid, numeric, text, numeric) from public;
grant execute on function public.rpc_shop_update_days_worked(uuid, numeric, text, numeric) to authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. RPC: ATOMIC MASTER BRAND ADMINISTRATOR CREATION
-- Allows Platform Master to create brand admin users atomically in PostgreSQL
-- ------------------------------------------------------------------------------
create or replace function public.rpc_master_create_brand_admin(
    p_brand_id uuid,
    p_name text,
    p_email text,
    p_phone text default null,
    p_password text default 'AdminPass123!'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
    v_caller_role text;
    v_user_id uuid;
    v_encrypted_pw text;
begin
    -- Check caller is master
    select role into v_caller_role
    from public.profiles
    where id = auth.uid();

    if v_caller_role not in ('master', 'platform_admin') then
        return jsonb_build_object('success', false, 'error', 'Unauthorized: Platform Master access required.');
    end if;

    if not exists (select 1 from public.brands where id = p_brand_id) then
        return jsonb_build_object('success', false, 'error', 'Target brand not found.');
    end if;

    select id into v_user_id
    from auth.users
    where email = lower(trim(p_email));

    if v_user_id is null then
        v_user_id := gen_random_uuid();
        v_encrypted_pw := crypt(p_password, gen_salt('bf'));

        insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
        ) values (
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
            now()
        );
    else
        update auth.users
        set encrypted_password = crypt(p_password, gen_salt('bf')),
            updated_at = now()
        where id = v_user_id;
    end if;

    insert into public.profiles (
        id, role, brand_id, full_name, phone, is_active, must_change_password, updated_at
    ) values (
        v_user_id, 'admin', p_brand_id, p_name, p_phone, true, true, now()
    )
    on conflict (id) do update set
        role = 'admin',
        brand_id = p_brand_id,
        full_name = p_name,
        phone = p_phone,
        is_active = true,
        must_change_password = true,
        updated_at = now();

    return jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', lower(trim(p_email))
    );
end;
$$;

revoke all on function public.rpc_master_create_brand_admin from public;
grant execute on function public.rpc_master_create_brand_admin to authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. FIX get_login_email_for_username max(uuid) BUG
-- ------------------------------------------------------------------------------
create or replace function public.get_login_email_for_username(
  p_username text,
  p_brand_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
  v_count integer;
begin
  if p_username is null or trim(p_username) = '' then
    return null;
  end if;

  if p_brand_id is not null then
    select p.id, u.email::text
    into v_user_id, v_email
    from public.profiles p
    join auth.users u on u.id = p.id
    where lower(trim(p.username)) = lower(trim(p_username))
      and p.brand_id = p_brand_id
    limit 1;

    return v_email;
  else
    select count(*), min(p.id::text)::uuid
    into v_count, v_user_id
    from public.profiles p
    where lower(trim(p.username)) = lower(trim(p_username));

    if v_count = 1 then
      select u.email::text into v_email
      from auth.users u
      where u.id = v_user_id;

      return v_email;
    else
      return null;
    end if;
  end if;
end;
$$;

revoke all on function public.get_login_email_for_username from public;
grant execute on function public.get_login_email_for_username to anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 6. ENSURE PLATFORM MASTER USER (cafesync@gmail.com) HAS MASTER PROFILE
-- ------------------------------------------------------------------------------
do $$
declare
  v_master_id uuid;
begin
  select id into v_master_id
  from auth.users
  where email = 'cafesync@gmail.com';

  if v_master_id is not null then
    insert into public.profiles (
      id, role, full_name, is_active, must_change_password, updated_at
    ) values (
      v_master_id, 'master', 'Platform Master', true, false, now()
    )
    on conflict (id) do update set
      role = 'master',
      is_active = true,
      must_change_password = false,
      updated_at = now();
  end if;
end $$;

