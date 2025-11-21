-- Disable RLS for profiles table to allow user creation
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to authenticated users
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

-- Disable RLS for employee_coupons table too
ALTER TABLE public.employee_coupons DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.employee_coupons TO authenticated;
GRANT ALL ON public.employee_coupons TO service_role;