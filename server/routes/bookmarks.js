const router = require('express').Router();
const { supabase } = require('../supabaseClient');
const { auth } = require('../middleware/auth');

// Add bookmark
router.post('/:entryId', auth, async (req, res) => {
    try {
        const { data: bookmark, error } = await supabase
            .from('bookmarks')
            .insert({
                user_id: req.user.id,
                entry: req.params.entryId
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique violation
                return res.status(400).json({ error: 'Already bookmarked' });
            }
            throw error;
        }

        res.status(201).json({ ...bookmark, _id: bookmark.id, user: bookmark.user_id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove bookmark
router.delete('/:entryId', auth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('bookmarks')
            .delete()
            .eq('user_id', req.user.id)
            .eq('entry', req.params.entryId);

        if (error) throw error;
        res.json({ message: 'Bookmark removed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List user's bookmarks
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const start = (page - 1) * limit;
        const end = start + limit - 1;

        const { data: bookmarks, count, error } = await supabase
            .from('bookmarks')
            .select(`
                *,
                entry:entries!bookmarks_entry_fkey(
                    id, title, word_count, created_at, likes_count,
                    author:profiles!entries_author_fkey(id, username, display_name, avatar),
                    shelf:shelves!entries_shelf_fkey(id, title)
                )
            `, { count: 'exact' })
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) throw error;

        const mapped = (bookmarks || []).map(b => ({
            ...b,
            _id: b.id,
            user: b.user_id,
            createdAt: b.created_at,
            entry: b.entry ? {
                ...b.entry,
                _id: b.entry.id,
                wordCount: b.entry.word_count,
                likesCount: b.entry.likes_count,
                createdAt: b.entry.created_at,
                author: b.entry.author ? { ...b.entry.author, _id: b.entry.author.id, displayName: b.entry.author.display_name } : null,
                shelf: b.entry.shelf ? { ...b.entry.shelf, _id: b.entry.shelf.id } : null
            } : null
        }));

        res.json({
            bookmarks: mapped,
            page,
            totalPages: Math.ceil((count || 0) / limit),
            total: count || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check if entry is bookmarked
router.get('/check/:entryId', auth, async (req, res) => {
    try {
        const { data: bookmark, error } = await supabase
            .from('bookmarks')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('entry', req.params.entryId)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        
        res.json({ isBookmarked: !!bookmark });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
