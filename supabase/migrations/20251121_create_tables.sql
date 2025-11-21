-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  email text NULL,
  full_name text NULL,
  role text NOT NULL DEFAULT 'subscriber'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- Create employee_coupons table
CREATE TABLE IF NOT EXISTS public.employee_coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  code text NOT NULL,
  discount_percent integer NOT NULL DEFAULT 20,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT employee_coupons_pkey PRIMARY KEY (id),
  CONSTRAINT employee_coupons_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create letters table
CREATE TABLE IF NOT EXISTS public.letters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  letter_type text NOT NULL,
  title text NOT NULL,
  intake_data jsonb NULL,
  ai_draft_content text NULL,
  admin_edited_content text NULL,
  status text NOT NULL DEFAULT 'pending_review'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT letters_pkey PRIMARY KEY (id),
  CONSTRAINT letters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_type text NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  credits_remaining integer NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create commissions table
CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  letter_id uuid NOT NULL,
  commission_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT commissions_pkey PRIMARY KEY (id),
  CONSTRAINT commissions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT commissions_letter_id_fkey FOREIGN KEY (letter_id) REFERENCES public.letters(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles USING btree (role);
CREATE INDEX IF NOT EXISTS letters_user_id_idx ON public.letters USING btree (user_id);
CREATE INDEX IF NOT EXISTS letters_status_idx ON public.letters USING btree (status);
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions USING btree (user_id);
CREATE INDEX IF NOT EXISTS commissions_employee_id_idx ON public.commissions USING btree (employee_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own letters" ON public.letters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own letters" ON public.letters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own letters" ON public.letters FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins can view all letters" ON public.letters FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Admins can update all letters" ON public.letters FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Function to deduct letter allowance
CREATE OR REPLACE FUNCTION public.deduct_letter_allowance(u_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits int;
BEGIN
  -- Get current credits
  SELECT credits_remaining INTO current_credits
  FROM public.subscriptions
  WHERE user_id = u_id AND status = 'active'
  FOR UPDATE;

  -- Check if user has credits
  IF current_credits IS NULL OR current_credits <= 0 THEN
    RETURN false;
  END IF;

  -- Deduct one credit
  UPDATE public.subscriptions
  SET credits_remaining = credits_remaining - 1,
      updated_at = now()
  WHERE user_id = u_id AND status = 'active';

  RETURN true;
END;
$$;

-- Grant access to functions
GRANT EXECUTE ON FUNCTION public.deduct_letter_allowance TO authenticated;