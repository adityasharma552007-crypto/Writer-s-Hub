const router = require('express').Router();
const { supabase } = require('../supabaseClient');
const { auth, optionalAuth } = require('../middleware/auth');
const { uploadCover } = require('../middleware/upload');

// Create shelf
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, visibility, status, genreTags } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const { count } = await supabase
            .from('shelves')
            .select('*', { count: 'exact', head: true })
            .eq('owner', req.user.id);

        const { data: shelf, error } = await supabase
            .from('shelves')
            .insert({
                owner: req.user.id,
                title,
                description,
                visibility: visibility || 'public',
                status: status || 'ongoing',
                genre_tags: genreTags || [],
                order: count || 0
            })
            .select()
            .single();

        if (error) throw error;
        // Supabase returns genre_tags, map it to front end genreTags
        res.status(201).json({ ...shelf, genreTags: shelf.genre_tags });
    } catch (error) {
        console.error('[Shelves] POST / error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get shelves by user
router.get('/user/:userId', optionalAuth, async (req, res) => {
    try {
        const userId = req.params.userId;
        const isOwner = req.user && req.user.id === userId;

        let query = supabase.from('shelves').select('*').eq('owner', userId).order('order', { ascending: true });
        
        if (!isOwner) {
            query = query.eq('visibility', 'public').eq('archived', false);
        }

        const { data: shelves, error } = await query;
        if (error) throw error;

        // Map camelCase for frontend
        const mapped = shelves.map(s => ({
            ...s,
            _id: s.id,
            genreTags: s.genre_tags,
            coverImage: s.cover_image
        }));

        res.json(mapped);
    } catch (error) {
        console.error('[Shelves] GET /user/:userId error:', error);
        res.status(500).json({ error: error.message || 'Internal server error while fetching shelves' });
    }
});

// Get single shelf with entries
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const { data: shelf, error: shelfErr } = await supabase
            .from('shelves')
            .select('*, owner:profiles!shelves_owner_fkey(id, username, display_name, avatar)')
            .eq('id', req.params.id)
            .single();

        if (shelfErr) throw shelfErr;
        if (!shelf) return res.status(404).json({ error: 'Shelf not found' });

        const isOwner = req.user && req.user.id === shelf.owner.id;
        if (!isOwner && shelf.visibility !== 'public') {
            return res.status(404).json({ error: 'Shelf not found' });
        }

        let entryQuery = supabase
            .from('entries')
            .select('id, title, word_count, visibility, tags, created_at, updated_at, order, likes_count')
            .eq('shelf', shelf.id)
            .order('order', { ascending: true });

        if (!isOwner) {
            entryQuery = entryQuery.eq('visibility', 'published');
        }

        const { data: entries, error: entryErr } = await entryQuery;
        if (entryErr) throw entryErr;

        // Map response for frontend
        res.json({ 
            shelf: {
                ...shelf,
                _id: shelf.id,
                genreTags: shelf.genre_tags,
                coverImage: shelf.cover_image,
                owner: {
                    _id: shelf.owner.id,
                    username: shelf.owner.username,
                    displayName: shelf.owner.display_name,
                    avatar: shelf.owner.avatar
                }
            }, 
            entries: entries.map(e => ({
                ...e,
                _id: e.id,
                wordCount: e.word_count,
                createdAt: e.created_at,
                updatedAt: e.updated_at,
                likesCount: e.likes_count
            })), 
            isOwner 
        });
    } catch (error) {
        console.error('[Shelves] GET /:id error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update shelf
router.put('/:id', auth, async (req, res) => {
    try {
        const { data: shelfCheck, error: checkErr } = await supabase.from('shelves').select('owner').eq('id', req.params.id).single();
        if (checkErr || !shelfCheck) return res.status(404).json({ error: 'Shelf not found' });
        if (shelfCheck.owner !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

        const updates = {};
        const allowedUpdates = ['title', 'description', 'visibility', 'status', 'archived'];
        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }
        if (req.body.genreTags !== undefined) updates.genre_tags = req.body.genreTags;
        updates.updated_at = new Date().toISOString();

        const { data: shelf, error } = await supabase
            .from('shelves')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json({ ...shelf, _id: shelf.id, genreTags: shelf.genre_tags, coverImage: shelf.cover_image });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload shelf cover
router.post('/:id/cover', auth, uploadCover, async (req, res) => {
    try {
        const { data: shelfCheck, error: checkErr } = await supabase.from('shelves').select('owner').eq('id', req.params.id).single();
        if (checkErr || !shelfCheck) return res.status(404).json({ error: 'Shelf not found' });
        if (shelfCheck.owner !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

        const { data: shelf, error } = await supabase
            .from('shelves')
            .update({ cover_image: `/uploads/${req.file.filename}`, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json({ ...shelf, _id: shelf.id, coverImage: shelf.cover_image });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reorder shelves
router.put('/reorder', auth, async (req, res) => {
    try {
        const { shelfIds } = req.body;
        for (let i = 0; i < shelfIds.length; i++) {
            await supabase.from('shelves').update({ order: i }).eq('id', shelfIds[i]).eq('owner', req.user.id);
        }
        res.json({ message: 'Shelves reordered' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete shelf (cascade handles entries implicitly if set up in DB)
router.delete('/:id', auth, async (req, res) => {
    try {
        const { data: shelfCheck, error: checkErr } = await supabase.from('shelves').select('owner').eq('id', req.params.id).single();
        if (checkErr || !shelfCheck) return res.status(404).json({ error: 'Shelf not found' });
        if (shelfCheck.owner !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

        const { error } = await supabase.from('shelves').delete().eq('id', req.params.id);
        if (error) throw error;

        res.json({ message: 'Shelf and entries deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
