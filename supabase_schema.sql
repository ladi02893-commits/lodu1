-- =========================================================
-- ROYAL LUDO ONLINE - SUPABASE DATABASE SCHEMA & POLICIES
-- =========================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT DEFAULT 'avatar_1',
  avatar_frame TEXT DEFAULT 'frame_none',
  dice_skin TEXT DEFAULT 'dice_gold',
  board_theme TEXT DEFAULT 'theme_royal',
  token_skin TEXT DEFAULT 'token_royal',
  player_id TEXT UNIQUE NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  coins BIGINT DEFAULT 1500,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  total_captures INTEGER DEFAULT 0,
  best_win_streak INTEGER DEFAULT 0,
  current_win_streak INTEGER DEFAULT 0,
  is_online BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user',
  is_vip BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_id TEXT NOT NULL,
  mode TEXT DEFAULT 'room_private',
  status TEXT DEFAULT 'open',
  max_players INTEGER DEFAULT 4,
  settings JSONB DEFAULT '{"betAmount": 0, "totalPot": 0, "turnDurationSeconds": 30}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ROOM PLAYERS TABLE
CREATE TABLE IF NOT EXISTS public.room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  seat INTEGER NOT NULL,
  color TEXT NOT NULL,
  is_ready BOOLEAN DEFAULT false,
  is_host BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MATCHES TABLE
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  mode TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress',
  winner_user_id TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0
);

-- 5. MATCH PLAYERS TABLE
CREATE TABLE IF NOT EXISTS public.match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  seat INTEGER NOT NULL,
  color TEXT NOT NULL,
  final_position INTEGER,
  tokens_finished INTEGER DEFAULT 0,
  captures INTEGER DEFAULT 0,
  result TEXT DEFAULT 'playing'
);

-- 6. GAME MOVES TABLE
CREATE TABLE IF NOT EXISTS public.game_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  move_number INTEGER NOT NULL,
  user_id TEXT,
  action_type TEXT NOT NULL,
  token_id INTEGER,
  dice_value INTEGER,
  from_position INTEGER,
  to_position INTEGER,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. FRIENDS TABLE
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. FRIEND REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. DEPOSIT REQUESTS TABLE (Coin Purchases / Payment Orders)
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  package_id TEXT NOT NULL,
  coins_amount BIGINT NOT NULL,
  bonus_coins BIGINT DEFAULT 0,
  fiat_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PKR',
  payment_method TEXT NOT NULL,
  sender_account_or_name TEXT NOT NULL,
  transaction_reference_id TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. CLANS & GUILDS TABLE
CREATE TABLE IF NOT EXISTS public.clans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  tag VARCHAR(10) UNIQUE NOT NULL,
  description TEXT,
  badge_icon VARCHAR(50) DEFAULT 'shield_crown',
  banner_color VARCHAR(30) DEFAULT '#d97706',
  leader_id VARCHAR(100) NOT NULL,
  leader_name VARCHAR(100) NOT NULL,
  min_level INT DEFAULT 1,
  trophies INT DEFAULT 0,
  weekly_chest_score INT DEFAULT 0,
  member_count INT DEFAULT 1,
  max_members INT DEFAULT 50,
  is_open BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. CLAN MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.clan_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id VARCHAR(100) NOT NULL,
  username VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(100) DEFAULT 'avatar_1',
  role VARCHAR(30) DEFAULT 'member', -- leader, co_leader, elder, member
  trophies_contributed INT DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clan_id, user_id)
);

-- 13. CLAN CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.clan_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID REFERENCES public.clans(id) ON DELETE CASCADE,
  sender_id VARCHAR(100) NOT NULL,
  sender_name VARCHAR(100) NOT NULL,
  sender_avatar VARCHAR(100) DEFAULT 'avatar_1',
  sender_role VARCHAR(30) DEFAULT 'member',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_messages ENABLE ROW LEVEL SECURITY;

-- 15. PUBLIC POLICIES
CREATE POLICY IF NOT EXISTS "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public Insert Profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Public Update Profiles" ON public.profiles FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Public Read Rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public Insert Rooms" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Public Update Rooms" ON public.rooms FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Public Delete Rooms" ON public.rooms FOR DELETE USING (true);

CREATE POLICY IF NOT EXISTS "Public Read Room Players" ON public.room_players FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public Insert Room Players" ON public.room_players FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Public Update Room Players" ON public.room_players FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Public Delete Room Players" ON public.room_players FOR DELETE USING (true);

CREATE POLICY IF NOT EXISTS "Public Read Matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public Insert Matches" ON public.matches FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Public Update Matches" ON public.matches FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Public Read Match Players" ON public.match_players FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public Insert Match Players" ON public.match_players FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Public Update Match Players" ON public.match_players FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Public Read Game Moves" ON public.game_moves FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public Insert Game Moves" ON public.game_moves FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Public Read Transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public Insert Transactions" ON public.transactions FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Public Read Friends" ON public.friends FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public Insert Friends" ON public.friends FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Public Delete Friends" ON public.friends FOR DELETE USING (true);

CREATE POLICY IF NOT EXISTS "Public Read Friend Requests" ON public.friend_requests FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public Insert Friend Requests" ON public.friend_requests FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Public Update Friend Requests" ON public.friend_requests FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Public Delete Friend Requests" ON public.friend_requests FOR DELETE USING (true);

CREATE POLICY IF NOT EXISTS "Public Read Deposit Requests" ON public.deposit_requests FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public Insert Deposit Requests" ON public.deposit_requests FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Public Update Deposit Requests" ON public.deposit_requests FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Public Delete Deposit Requests" ON public.deposit_requests FOR DELETE USING (true);

CREATE POLICY IF NOT EXISTS "Public Read Clans" ON public.clans FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public Insert Clans" ON public.clans FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Public Update Clans" ON public.clans FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Public Delete Clans" ON public.clans FOR DELETE USING (true);

CREATE POLICY IF NOT EXISTS "Public Read Clan Members" ON public.clan_members FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public Insert Clan Members" ON public.clan_members FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Public Update Clan Members" ON public.clan_members FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Public Delete Clan Members" ON public.clan_members FOR DELETE USING (true);

CREATE POLICY IF NOT EXISTS "Public Read Clan Messages" ON public.clan_messages FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public Insert Clan Messages" ON public.clan_messages FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Public Delete Clan Messages" ON public.clan_messages FOR DELETE USING (true);
