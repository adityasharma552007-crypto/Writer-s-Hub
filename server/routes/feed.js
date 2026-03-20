const router = require('express').Router();
const { supabase } = require('../supabaseClient');
const { auth } = require('../middleware/auth');

// Get personalized feed
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('following, genre_tags')
            .eq('id', req.user.id)
            .single();

        if (userError) throw userError;

        const following = user.following || [];

        // Following feed
        let followingEntries = [];
        if (following.length > 0) {
            const { data: fData } = await supabase
                .from('entries')
                .select('*, author:profiles!entries_author_fkey(id, username, display_name, avatar), shelf:shelves!entries_shelf_fkey(title)')
                .in('author', following)
                .eq('visibility', 'published')
                .order('created_at', { ascending: false })
                .range(skip, skip + limit - 1);
            followingEntries = fData || [];
        }

        // Trending (most liked in last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: trendingData } = await supabase
            .from('entries')
            .select('*, author:profiles!entries_author_fkey(id, username, display_name, avatar), shelf:shelves!entries_shelf_fkey(title)')
            .eq('visibility', 'published')
            .gte('created_at', sevenDaysAgo)
            .order('likes_count', { ascending: false })
            .limit(10);

        // Suggestions based on user genre tags (overlap)
        let suggestions = [];
        if (user.genre_tags && user.genre_tags.length > 0) {
            const excludeIds = [...following, req.user.id];
            // Supabase overlaps array syntax
            const { data: sData } = await supabase
                .from('entries')
                .select('*, author:profiles!entries_author_fkey(id, username, display_name, avatar), shelf:shelves!entries_shelf_fkey(title)')
                .eq('visibility', 'published')
                .overlaps('tags', user.genre_tags)
                .not('author', 'in', `(${excludeIds.join(',')})`)
                .order('likes_count', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(10);
            suggestions = sData || [];
        }

        const mapEntry = (e) => ({
            ...e,
            _id: e.id,
            wordCount: e.word_count,
            likesCount: e.likes_count,
            createdAt: e.created_at,
            author: e.author ? {
                _id: e.author.id,
                username: e.author.username,
                displayName: e.author.display_name,
                avatar: e.author.avatar
            } : null
        });

        res.json({
            following: followingEntries.map(mapEntry),
            trending: (trendingData || []).map(mapEntry),
            suggestions: suggestions.map(mapEntry),
            page
        });
    } catch (error) {
        console.error('[Feed] GET / error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get trending (public, no auth required)
router.get('/trending', async (req, res) => {
    try {
        const period = req.query.period || 'week';
        const genre = req.query.genre;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const periodDays = period === 'month' ? 30 : 7;
        const dateThreshold = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

        let query = supabase
            .from('entries')
            .select('*, author:profiles!entries_author_fkey(id, username, display_name, avatar), shelf:shelves!entries_shelf_fkey(title)', { count: 'exact' })
            .eq('visibility', 'published')
            .gte('created_at', dateThreshold);

        if (genre) {
            query = query.contains('tags', [genre]);
        }

        const { data: entries, count: total, error } = await query
            .order('likes_count', { ascending: false })
            .range(skip, skip + limit - 1);

        if (error) throw error;

        res.json({
            entries: entries.map(e => ({
                ...e,
                _id: e.id,
                wordCount: e.word_count,
                likesCount: e.likes_count,
                createdAt: e.created_at,
                author: e.author ? {
                    _id: e.author.id,
                    username: e.author.username,
                    displayName: e.author.display_name,
                    avatar: e.author.avatar
                } : null
            })),
            page,
            totalPages: Math.ceil((total || 0) / limit),
            total: total || 0
        });
    } catch (error) {
        console.error('[Feed] GET /trending error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
