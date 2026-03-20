const router = require('express').Router();
const { supabase } = require('../supabaseClient');
const { auth } = require('../middleware/auth');
const { createNotification } = require('../utils/notify');

// Create repost
router.post('/:entryId', auth, async (req, res) => {
    try {
        const { data: entry } = await supabase
            .from('entries')
            .select('id, title, author, reposts_enabled')
            .eq('id', req.params.entryId)
            .single();

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        if (entry.reposts_enabled === false) {
            return res.status(403).json({ error: 'Reposts are disabled for this entry' });
        }
        if (entry.author === req.user.id) {
            return res.status(400).json({ error: 'Cannot repost your own entry' });
        }

        const { data: repost, error } = await supabase
            .from('reposts')
            .insert({
                reposter: req.user.id,
                original_entry: req.params.entryId,
                original_author: entry.author
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique violation
                return res.status(400).json({ error: 'Already reposted' });
            }
            throw error;
        }

        const { data: reposter } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('id', req.user.id)
            .single();

        await createNotification({
            recipient: entry.author,
            sender: req.user.id,
            type: 'repost',
            message: `${reposter?.display_name || reposter?.username} reposted your entry "${entry.title}"`,
            link: `/entry/${entry.id}`
        });

        res.status(201).json({ ...repost, _id: repost.id, originalEntry: repost.original_entry, originalAuthor: repost.original_author });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete repost
router.delete('/:entryId', auth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('reposts')
            .delete()
            .eq('reposter', req.user.id)
            .eq('original_entry', req.params.entryId);

        if (error) throw error;
        res.json({ message: 'Repost removed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List reposts by user
router.get('/user/:userId', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const start = (page - 1) * limit;
        const end = start + limit - 1;

        const { data: reposts, count, error } = await supabase
            .from('reposts')
            .select(`
                *,
                original_entry:entries!reposts_original_entry_fkey(
                    id, title, body, word_count, created_at, likes_count,
                    shelf:shelves!entries_shelf_fkey(id, title)
                ),
                original_author:profiles!reposts_original_author_fkey(id, username, display_name, avatar)
            `, { count: 'exact' })
            .eq('reposter', req.params.userId)
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) throw error;

        const mapped = (reposts || []).map(r => ({
            ...r,
            _id: r.id,
            createdAt: r.created_at,
            originalAuthor: r.original_author ? { ...r.original_author, _id: r.original_author.id, displayName: r.original_author.display_name } : null,
            originalEntry: r.original_entry ? {
                ...r.original_entry,
                _id: r.original_entry.id,
                wordCount: r.original_entry.word_count,
                likesCount: r.original_entry.likes_count,
                createdAt: r.original_entry.created_at,
                shelf: r.original_entry.shelf ? { ...r.original_entry.shelf, _id: r.original_entry.shelf.id } : null
            } : null
        }));

        res.json({ 
            reposts: mapped, 
            page, 
            totalPages: Math.ceil((count || 0) / limit), 
            total: count || 0 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check if entry is reposted by user
router.get('/check/:entryId', auth, async (req, res) => {
    try {
        const { data: repost, error } = await supabase
            .from('reposts')
            .select('id')
            .eq('reposter', req.user.id)
            .eq('original_entry', req.params.entryId)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        res.json({ isReposted: !!repost });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
