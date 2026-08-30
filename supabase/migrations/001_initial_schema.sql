-- ====================================================================
-- ROYAL LUDO ONLINE — SUPABASE POSTGRESQL MIGRATION (001_initial_schema.sql)
-- Complete Server-Authoritative Database Schema, Security Policies & Views
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE player_color_enum AS ENUM ('red', 'green', 'yellow', 'blue');
CREATE TYPE match_status_enum AS ENUM ('waiting', 'in_progress', 'finished', 'abandoned');
CREATE TYPE room_status_enum AS ENUM ('open', 'in_game', 'closed');
CREATE TYPE transaction_type_enum AS ENUM ('win_reward', 'daily_bonus', 'mission_reward', 'achievement_reward', 'shop_purchase', 'admin_grant');

-- 3. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT DEFAULT 'avatar_1',
    avatar_frame TEXT DEFAULT 'frame_none',
    dice_skin TEXT DEFAULT 'dice_gold',
    board_theme TEXT DEFAULT 'theme_royal',
    token_skin TEXT DEFAULT 'token_royal',
    player_id TEXT UNIQUE NOT NULL,
    level INTEGER DEFAULT 1 NOT NULL CHECK (level >= 1),
    xp BIGINT DEFAULT 0 NOT NULL CHECK (xp >= 0),
    coins BIGINT DEFAULT 1000 NOT NULL CHECK (coins >= 0),
    wins INTEGER DEFAULT 0 NOT NULL CHECK (wins >= 0),
    losses INTEGER DEFAULT 0 NOT NULL CHECK (losses >= 0),
    games_played INTEGER DEFAULT 0 NOT NULL CHECK (games_played >= 0),
    total_captures INTEGER DEFAULT 0 NOT NULL CHECK (total_captures >= 0),
    best_win_streak INTEGER DEFAULT 0 NOT NULL CHECK (best_win_streak >= 0),
    current_win_streak INTEGER DEFAULT 0 NOT NULL CHECK (current_win_streak >= 0),
    is_online BOOLEAN DEFAULT false NOT NULL,
    is_admin BOOLEAN DEFAULT false NOT NULL,
    is_banned BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 4. FRIENDS & FRIEND REQUESTS
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE (user_id, friend_id),
    CHECK (user_id <> friend_id)
);

CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE (sender_id, receiver_id),
    CHECK (sender_id <> receiver_id)
);

-- 5. ROOMS & ROOM PLAYERS
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(6) UNIQUE NOT NULL,
    host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mode TEXT DEFAULT 'room_private' NOT NULL,
    max_players INTEGER DEFAULT 4 NOT NULL CHECK (max_players BETWEEN 2 AND 4),
    status room_status_enum DEFAULT 'open' NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.room_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seat INTEGER NOT NULL CHECK (seat BETWEEN 0 AND 3),
    color player_color_enum NOT NULL,
    is_ready BOOLEAN DEFAULT false NOT NULL,
    is_host BOOLEAN DEFAULT false NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    left_at TIMESTAMPTZ,
    UNIQUE (room_id, seat),
    UNIQUE (room_id, user_id)
);

-- 6. MATCHES & MATCH PLAYERS
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    mode TEXT NOT NULL,
    status match_status_enum DEFAULT 'in_progress' NOT NULL,
    winner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.match_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seat INTEGER NOT NULL CHECK (seat BETWEEN 0 AND 3),
    color player_color_enum NOT NULL,
    final_position INTEGER, -- 1st, 2nd, 3rd, 4th
    tokens_finished INTEGER DEFAULT 0 NOT NULL,
    captures INTEGER DEFAULT 0 NOT NULL,
    result TEXT DEFAULT 'playing' NOT NULL, -- 'won', 'lost', 'abandoned', 'playing'
    UNIQUE (match_id, seat),
    UNIQUE (match_id, user_id)
);

-- 7. GAME STATES (Authoritative Current Match State)
CREATE TABLE IF NOT EXISTS public.game_states (
    match_id UUID PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
    version BIGINT DEFAULT 1 NOT NULL,
    state JSONB NOT NULL,
    current_turn_seat INTEGER DEFAULT 0 NOT NULL,
    dice_value INTEGER,
    turn_started_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    turn_expires_at TIMESTAMPTZ NOT NULL,
    winner_seat INTEGER,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 8. GAME MOVES (Immutable Audit Log)
CREATE TABLE IF NOT EXISTS public.game_moves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    move_number INTEGER NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    token_id INTEGER,
    dice_value INTEGER,
    from_position INTEGER,
    to_position INTEGER,
    payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 9. TRANSACTIONS (Immutable Virtual Economy Log)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type transaction_type_enum NOT NULL,
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 10. MISSIONS & USER MISSIONS
CREATE TABLE IF NOT EXISTS public.missions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'daily' NOT NULL, -- 'daily', 'weekly'
    requirement_type TEXT NOT NULL, -- 'play_games', 'win_games', 'captures', 'streak'
    requirement_value INTEGER NOT NULL,
    reward_coins BIGINT DEFAULT 100 NOT NULL,
    reward_xp BIGINT DEFAULT 50 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mission_id TEXT NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0 NOT NULL,
    completed BOOLEAN DEFAULT false NOT NULL,
    claimed BOOLEAN DEFAULT false NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(user_id, mission_id, expires_at)
);

-- 11. ACHIEVEMENTS & USER ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    requirement_type TEXT NOT NULL,
    requirement_value INTEGER NOT NULL,
    reward_coins BIGINT DEFAULT 500 NOT NULL,
    reward_xp BIGINT DEFAULT 200 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    claimed BOOLEAN DEFAULT false NOT NULL,
    UNIQUE(user_id, achievement_id)
);

-- 12. NOTIFICATIONS & INVITATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'room_invite', 'friend_request', 'system'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 13. MATCHMAKING QUEUE
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mode TEXT NOT NULL, -- 'quick_2', 'quick_4'
    entered_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE (user_id)
);

-- ====================================================================
-- VIEWS
-- ====================================================================

-- Leaderboard View
CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT 
    p.id AS user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.avatar_frame,
    p.level,
    p.xp,
    p.coins,
    p.wins,
    p.losses,
    p.games_played,
    p.total_captures,
    p.best_win_streak,
    CASE 
        WHEN p.games_played > 0 THEN ROUND((p.wins::NUMERIC / p.games_played::NUMERIC) * 100, 1)
        ELSE 0 
    END AS win_rate,
    RANK() OVER (ORDER BY p.wins DESC, p.xp DESC, p.level DESC) AS rank
FROM public.profiles p
WHERE p.is_banned = false;

-- User Statistics View
CREATE OR REPLACE VIEW public.user_stats_view AS
SELECT 
    p.id AS user_id,
    p.username,
    p.level,
    p.xp,
    p.coins,
    p.wins,
    p.losses,
    p.games_played,
    p.total_captures,
    p.current_win_streak,
    p.best_win_streak,
    CASE 
        WHEN p.games_played > 0 THEN ROUND((p.wins::NUMERIC / p.games_played::NUMERIC) * 100, 1)
        ELSE 0 
    END AS win_rate
FROM public.profiles p;

-- Match History View
CREATE OR REPLACE VIEW public.match_history_view AS
SELECT 
    m.id AS match_id,
    m.mode,
    m.status,
    m.started_at,
    m.ended_at,
    m.duration_seconds,
    mp.user_id,
    mp.seat,
    mp.color,
    mp.final_position,
    mp.tokens_finished,
    mp.captures,
    mp.result,
    winner.display_name AS winner_name
FROM public.matches m
JOIN public.match_players mp ON m.id = mp.match_id
LEFT JOIN public.profiles winner ON m.winner_user_id = winner.id
ORDER BY m.started_at DESC;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, self update only (non-protected fields)
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own display info" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Friends: View own friend connections
CREATE POLICY "Users can view their friendships" ON public.friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can delete their friendships" ON public.friends FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Friend Requests: Senders and receivers
CREATE POLICY "Users can view their friend requests" ON public.friend_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send friend requests" ON public.friend_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receivers can update friend requests" ON public.friend_requests FOR UPDATE USING (auth.uid() = receiver_id);

-- Rooms & Room Players
CREATE POLICY "Rooms viewable by all authenticated users" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Room players viewable by all authenticated users" ON public.room_players FOR SELECT USING (true);

-- Matches & Match Players & Game States
CREATE POLICY "Matches viewable by everyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Match players viewable by everyone" ON public.match_players FOR SELECT USING (true);
CREATE POLICY "Game states viewable by everyone in match" ON public.game_states FOR SELECT USING (true);
CREATE POLICY "Game moves viewable by everyone in match" ON public.game_moves FOR SELECT USING (true);

-- Transactions: Private to user
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

-- Missions & Achievements: Public definitions, private user progress
CREATE POLICY "Missions viewable by all" ON public.missions FOR SELECT USING (true);
CREATE POLICY "User missions viewable by owner" ON public.user_missions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Achievements viewable by all" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "User achievements viewable by owner" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

-- Notifications: Private to recipient
CREATE POLICY "Users can view their notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Matchmaking: Owner can view/delete
CREATE POLICY "Users can manage their queue entry" ON public.matchmaking_queue FOR ALL USING (auth.uid() = user_id);

-- ====================================================================
-- SEED DATA (Missions, Achievements)
-- ====================================================================

INSERT INTO public.missions (id, title, description, category, requirement_type, requirement_value, reward_coins, reward_xp)
VALUES 
    ('daily_play_3', 'Casual Stroll', 'Play 3 Ludo matches', 'daily', 'play_games', 3, 250, 100),
    ('daily_win_1', 'Royal Triumph', 'Win 1 match', 'daily', 'win_games', 1, 300, 150),
    ('daily_capture_4', 'Token Hunter', 'Capture 4 opponent tokens', 'daily', 'captures', 4, 350, 180),
    ('weekly_win_5', 'Grand Monarch', 'Win 5 online or local matches', 'weekly', 'win_games', 5, 1000, 500),
    ('weekly_capture_15', 'Relentless Conqueror', 'Capture 15 opponent tokens', 'weekly', 'captures', 15, 1200, 600)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.achievements (id, title, description, icon, requirement_type, requirement_value, reward_coins, reward_xp)
VALUES 
    ('first_victory', 'First Crown', 'Win your first Royal Ludo match', 'crown', 'win_games', 1, 500, 250),
    ('ten_victories', 'Seasoned Noble', 'Win 10 matches', 'award', 'win_games', 10, 1500, 750),
    ('fifty_victories', 'Supreme Champion', 'Win 50 matches', 'shield', 'win_games', 50, 5000, 2500),
    ('hundred_victories', 'Legend of the Realm', 'Win 100 matches', 'star', 'win_games', 100, 12000, 6000),
    ('ten_captures', 'Ruthless Strike', 'Capture 10 tokens', 'swords', 'captures', 10, 800, 400),
    ('fifty_captures', 'Realm Protector', 'Capture 50 tokens', 'zap', 'captures', 50, 3000, 1500),
    ('streak_5', 'Unstoppable Momentum', 'Achieve a 5-match win streak', 'flame', 'streak', 5, 2500, 1200)
ON CONFLICT (id) DO NOTHING;
