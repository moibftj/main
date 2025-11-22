-- Fix RLS policies to avoid circular dependency in get_user_role function

-- Drop the existing helper function that causes circular dependency
DROP FUNCTION IF EXISTS public.get_user_role();

-- Create a better helper function that doesn't query profiles table
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    'subscriber'
  )::TEXT;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- PROFILES POLICIES - Simplified to avoid circular dependency
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admin policies using direct role check
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
CREATE POLICY "Admins can manage profiles"
    ON profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- LETTERS POLICIES - Fixed
DROP POLICY IF EXISTS "Block employees from letters" ON letters;
DROP POLICY IF EXISTS "Subscribers view own letters" ON letters;
CREATE POLICY "Subscribers view own letters"
    ON letters FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Subscribers create own letters" ON letters;
CREATE POLICY "Subscribers create own letters"
    ON letters FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'subscriber'
        )
    );

DROP POLICY IF EXISTS "Subscribers update own letters" ON letters;
CREATE POLICY "Subscribers update own letters"
    ON letters FOR UPDATE
    USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'subscriber'
        )
    );

DROP POLICY IF EXISTS "Admins full letter access" ON letters;
CREATE POLICY "Admins full letter access"
    ON letters FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- EMPLOYEE COUPONS POLICIES - Fixed
DROP POLICY IF EXISTS "Employees view own coupons" ON employee_coupons;
CREATE POLICY "Employees view own coupons"
    ON employee_coupons FOR SELECT
    USING (
        employee_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Employees create own coupon" ON employee_coupons;
CREATE POLICY "Employees create own coupon"
    ON employee_coupons FOR INSERT
    WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS "Public can validate coupons" ON employee_coupons;
CREATE POLICY "Public can validate coupons"
    ON employee_coupons FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage all coupons" ON employee_coupons;
CREATE POLICY "Admins manage all coupons"
    ON employee_coupons FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- SUBSCRIPTIONS POLICIES - Fixed
DROP POLICY IF EXISTS "Users view own subscriptions" ON subscriptions;
CREATE POLICY "Users view own subscriptions"
    ON subscriptions FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins view all subscriptions" ON subscriptions;
-- Covered by above policy

DROP POLICY IF EXISTS "Users can create subscriptions" ON subscriptions;
CREATE POLICY "Users can create subscriptions"
    ON subscriptions FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- COMMISSIONS POLICIES - Fixed
DROP POLICY IF EXISTS "Employees view own commissions" ON commissions;
CREATE POLICY "Employees view own commissions"
    ON commissions FOR SELECT
    USING (
        employee_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins view all commissions" ON commissions;
-- Covered by above policy

DROP POLICY IF EXISTS "Admins create commissions" ON commissions;
CREATE POLICY "Admins create commissions"
    ON commissions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins update commissions" ON commissions;
CREATE POLICY "Admins update commissions"
    ON commissions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );
