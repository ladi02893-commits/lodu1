-- ====================================================================
-- ROYAL LUDO ONLINE — MIGRATION 002: DEPOSITS, BETS & LEDGER TRANSACTIONS
-- ====================================================================

-- 1. DEPOSIT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.deposit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    package_id TEXT NOT NULL,
    coins_amount BIGINT NOT NULL,
    bonus_coins BIGINT DEFAULT 0 NOT NULL,
    fiat_amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'PKR' NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    sender_account_or_name TEXT NOT NULL,
    transaction_reference_id TEXT NOT NULL,
    screenshot_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 2. ALTER ROOMS & MATCHES TO SUPPORT CUSTOM BETS
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS bet_amount BIGINT DEFAULT 0 NOT NULL;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS total_pot BIGINT DEFAULT 0 NOT NULL;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS bet_amount BIGINT DEFAULT 0 NOT NULL;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS total_pot BIGINT DEFAULT 0 NOT NULL;

-- 3. ENABLE RLS ON DEPOSIT REQUESTS
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create deposit requests" ON public.deposit_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own deposit requests" ON public.deposit_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view and manage all deposit requests" ON public.deposit_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
