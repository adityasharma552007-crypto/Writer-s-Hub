-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. USERS TABLE
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    banner TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    genre_tags TEXT[] DEFAULT '{}',
    social_links JSONB DEFAULT '[]',
    show_stats BOOLEAN DEFAULT true,
    theme TEXT DEFAULT 'default',
    role TEXT DEFAULT 'creator',
    -- settings
    allow_follows BOOLEAN DEFAULT true,
    allow_comments BOOLEAN DEFAULT true,
    searchable BOOLEAN DEFAULT true,
    notify_likes BOOLEAN DEFAULT true,
    notify_comments BOOLEAN DEFAULT true,
    notify_follows BOOLEAN DEFAULT true,
    notify_reposts BOOLEAN DEFAULT true,
    notify_community BOOLEAN DEFAULT true,
    deactivated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. USER FOLLOWS (Join Table)
-- ==========================================
CREATE TABLE user_follows (
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- ==========================================
-- 3. SHELVES TABLE
-- ==========================================
CREATE TABLE shelves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    cover_image TEXT DEFAULT '',
    visibility TEXT DEFAULT 'public', -- 'public', 'private', 'draft'
    status TEXT DEFAULT 'ongoing',    -- 'ongoing', 'complete', 'hiatus'
    genre_tags TEXT[] DEFAULT '{}',
    "order" INTEGER DEFAULT 0,
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. ENTRIES TABLE
-- ==========================================
CREATE TABLE entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shelf_id UUID REFERENCES shelves(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    word_count INTEGER DEFAULT 0,
    "order" INTEGER DEFAULT 0,
    visibility TEXT DEFAULT 'draft', -- 'draft', 'published', 'scheduled', 'unlisted'
    scheduled_at TIMESTAMP WITH TIME ZONE,
    author_note TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    content_warnings TEXT[] DEFAULT '{}',
    content_hash TEXT DEFAULT '',
    title_history JSONB DEFAULT '[]',
    revision_notes JSONB DEFAULT '[]',
    likes_count INTEGER DEFAULT 0,
    comments_enabled BOOLEAN DEFAULT true,
    reposts_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. ENTRY LIKES (Join Table)
-- ==========================================
CREATE TABLE entry_likes (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, entry_id)
);

-- ==========================================
-- 6. BOOKMARKS TABLE
-- ==========================================
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    entry_id UUID REFERENCES entries(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, entry_id)
);

-- ==========================================
-- 7. COMMENTS TABLE
-- ==========================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID REFERENCES entries(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    body TEXT NOT NULL,
    pinned BOOLEAN DEFAULT false,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 8. COMMUNITIES TABLE
-- ==========================================
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    cover_image TEXT DEFAULT '',
    category TEXT DEFAULT 'general',
    rules TEXT[] DEFAULT '{}',
    privacy TEXT DEFAULT 'public', -- 'public', 'private', 'hidden'
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    is_official BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 9. COMMUNITY MEMBERS (Join Table)
-- ==========================================
CREATE TABLE community_members (
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- 'owner', 'moderator', 'member', 'pending'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (community_id, user_id)
);

-- ==========================================
-- 10. COMMUNITY POSTS TABLE
-- ==========================================
CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    body TEXT NOT NULL,
    shared_entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,
    pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 11. COMMUNITY POST LIKES (Join Table)
-- ==========================================
CREATE TABLE community_post_likes (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

-- ==========================================
-- 12. NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT DEFAULT '',
    read BOOLEAN DEFAULT false,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 13. REPORTS TABLE
-- ==========================================
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    target_type TEXT NOT NULL, -- 'entry', 'comment', 'community_post', 'user', 'community'
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (reporter_id, target_type, target_id)
);

-- ==========================================
-- 14. REPOSTS TABLE
-- ==========================================
CREATE TABLE reposts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reposter_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    original_entry_id UUID REFERENCES entries(id) ON DELETE CASCADE NOT NULL,
    original_author_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (reposter_id, original_entry_id)
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;

-- Basic Development Policies (Allow ALL for authenticated/anon users for now)
-- You can restrict these later when moving to production.

-- Users
CREATE POLICY "Allow public select on users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public insert on users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on users" ON users FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on users" ON users FOR DELETE USING (true);

-- User Follows
CREATE POLICY "Allow public select on user_follows" ON user_follows FOR SELECT USING (true);
CREATE POLICY "Allow public insert on user_follows" ON user_follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on user_follows" ON user_follows FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on user_follows" ON user_follows FOR DELETE USING (true);

-- Shelves
CREATE POLICY "Allow public select on shelves" ON shelves FOR SELECT USING (true);
CREATE POLICY "Allow public insert on shelves" ON shelves FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on shelves" ON shelves FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on shelves" ON shelves FOR DELETE USING (true);

-- Entries
CREATE POLICY "Allow public select on entries" ON entries FOR SELECT USING (true);
CREATE POLICY "Allow public insert on entries" ON entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on entries" ON entries FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on entries" ON entries FOR DELETE USING (true);

-- Entry Likes
CREATE POLICY "Allow public select on entry_likes" ON entry_likes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on entry_likes" ON entry_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on entry_likes" ON entry_likes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on entry_likes" ON entry_likes FOR DELETE USING (true);

-- Bookmarks
CREATE POLICY "Allow public select on bookmarks" ON bookmarks FOR SELECT USING (true);
CREATE POLICY "Allow public insert on bookmarks" ON bookmarks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on bookmarks" ON bookmarks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on bookmarks" ON bookmarks FOR DELETE USING (true);

-- Comments
CREATE POLICY "Allow public select on comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Allow public insert on comments" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on comments" ON comments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on comments" ON comments FOR DELETE USING (true);

-- Communities
CREATE POLICY "Allow public select on communities" ON communities FOR SELECT USING (true);
CREATE POLICY "Allow public insert on communities" ON communities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on communities" ON communities FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on communities" ON communities FOR DELETE USING (true);

-- Community Members
CREATE POLICY "Allow public select on community_members" ON community_members FOR SELECT USING (true);
CREATE POLICY "Allow public insert on community_members" ON community_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on community_members" ON community_members FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on community_members" ON community_members FOR DELETE USING (true);

-- Community Posts
CREATE POLICY "Allow public select on community_posts" ON community_posts FOR SELECT USING (true);
CREATE POLICY "Allow public insert on community_posts" ON community_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on community_posts" ON community_posts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on community_posts" ON community_posts FOR DELETE USING (true);

-- Community Post Likes
CREATE POLICY "Allow public select on community_post_likes" ON community_post_likes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on community_post_likes" ON community_post_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on community_post_likes" ON community_post_likes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on community_post_likes" ON community_post_likes FOR DELETE USING (true);

-- Notifications
CREATE POLICY "Allow public select on notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow public insert on notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on notifications" ON notifications FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on notifications" ON notifications FOR DELETE USING (true);

-- Reports
CREATE POLICY "Allow public select on reports" ON reports FOR SELECT USING (true);
CREATE POLICY "Allow public insert on reports" ON reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on reports" ON reports FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on reports" ON reports FOR DELETE USING (true);

-- Reposts
CREATE POLICY "Allow public select on reposts" ON reposts FOR SELECT USING (true);
CREATE POLICY "Allow public insert on reposts" ON reposts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on reposts" ON reposts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on reposts" ON reposts FOR DELETE USING (true);
