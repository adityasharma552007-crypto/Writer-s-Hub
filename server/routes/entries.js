const router = require('express').Router();
const { supabase } = require('../supabaseClient');
const { auth, optionalAuth } = require('../middleware/auth');
const { generateHash, checkPlagiarism } = require('../utils/fingerprint');
const { createNotification } = require('../utils/notify');

// Count words from HTML content
const countWords = (html) => {
    const text = html.replace(/<[^>]*>/g, '').trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
};

// Create entry
router.post('/', auth, async (req, res) => {
    try {
        const { shelf, title, body, authorNote, tags, contentWarnings, visibility } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const { data: shelfDoc } = await supabase
            .from('shelves')
            .select('owner')
            .eq('id', shelf)
            .single();

        if (!shelfDoc || shelfDoc.owner !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to add to this shelf' });
        }

        const { count } = await supabase
            .from('entries')
            .select('*', { count: 'exact', head: true })
            .eq('shelf', shelf);

        const { data: entry, error } = await supabase
            .from('entries')
            .insert({
                shelf,
                author: req.user.id,
                title,
                body: body || '',
                word_count: countWords(body || ''),
                order: count || 0,
                author_note: authorNote || '',
                tags: tags || [],
                content_warnings: contentWarnings || [],
                visibility: visibility || 'draft'
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ ...entry, _id: entry.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single entry
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const { data: entry, error: entryErr } = await supabase
            .from('entries')
            .select('*, author:profiles!entries_author_fkey(id, username, display_name, avatar), shelf:shelves!entries_shelf_fkey(id, title)')
            .eq('id', req.params.id)
            .single();

        if (entryErr || !entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        const isOwner = req.user && req.user.id === entry.author.id;
        if (!isOwner && entry.visibility === 'draft') {
            return res.status(404).json({ error: 'Entry not found' });
        }

        // Get prev/next entries in same shelf
        let visFilter = isOwner ? ['draft', 'published', 'scheduled', 'unlisted'] : ['published'];
        
        const { data: siblings } = await supabase
            .from('entries')
            .select('id, title, order')
            .eq('shelf', entry.shelf.id)
            .in('visibility', visFilter)
            .order('order', { ascending: true });

        const sList = siblings || [];
        const currentIndex = sList.findIndex(s => s.id === entry.id);
        
        const prevEntry = currentIndex > 0 ? { ...sList[currentIndex - 1], _id: sList[currentIndex - 1].id } : null;
        const nextEntry = currentIndex < sList.length - 1 ? { ...sList[currentIndex + 1], _id: sList[currentIndex + 1].id } : null;

        res.json({
            entry: {
                ...entry,
                _id: entry.id,
                wordCount: entry.word_count,
                authorNote: entry.author_note,
                contentWarnings: entry.content_warnings,
                likesCount: entry.likes_count,
                createdAt: entry.created_at,
                updatedAt: entry.updated_at,
                author: { ...entry.author, _id: entry.author.id, displayName: entry.author.display_name },
                shelf: { ...entry.shelf, _id: entry.shelf.id }
            },
            isOwner,
            isLiked: req.user ? (entry.likes || []).includes(req.user.id) : false,
            prevEntry,
            nextEntry
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update entry
router.put('/:id', auth, async (req, res) => {
    try {
        const { data: entry } = await supabase
            .from('entries')
            .select('id, author, title')
            .eq('id', req.params.id)
            .single();

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        if (entry.author !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { title, body, authorNote, tags, contentWarnings, visibility } = req.body;
        const updates = {};
        
        if (title !== undefined) updates.title = title;
        if (body !== undefined) {
            updates.body = body;
            updates.word_count = countWords(body);
        }
        if (authorNote !== undefined) updates.author_note = authorNote;
        if (tags !== undefined) updates.tags = tags;
        if (contentWarnings !== undefined) updates.content_warnings = contentWarnings;
        if (visibility !== undefined) updates.visibility = visibility;

        const { data: updatedEntry, error } = await supabase
            .from('entries')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json({ ...updatedEntry, _id: updatedEntry.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Publish entry (with plagiarism check)
router.post('/:id/publish', auth, async (req, res) => {
    try {
        const { data: entry } = await supabase
            .from('entries')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        if (entry.author !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (!entry.body || entry.body.trim() === '') {
            return res.status(400).json({ error: 'Cannot publish empty entry' });
        }

        // Anti-plagiarism check
        const matches = await checkPlagiarism(entry.body, req.user.id);
        if (matches.length > 0) {
            return res.status(409).json({
                error: 'Content similarity detected',
                matches
            });
        }

        const contentHash = generateHash(entry.body);
        const { data: updated, error } = await supabase
            .from('entries')
            .update({ 
                visibility: 'published',
                content_hash: contentHash 
            })
            .eq('id', entry.id)
            .select()
            .single();

        if (error) throw error;

        // Notify followers
        const { data: author } = await supabase
            .from('profiles')
            .select('followers, display_name, username')
            .eq('id', req.user.id)
            .single();

        if (author && author.followers && author.followers.length > 0) {
            for (const followerId of author.followers) {
                await createNotification({
                    recipient: followerId,
                    sender: req.user.id,
                    type: 'publish',
                    message: `${author.display_name || author.username} published "${updated.title}"`,
                    link: `/entry/${updated.id}`
                });
            }
        }

        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        console.error('[Entries API] publish error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Unpublish entry
router.post('/:id/unpublish', auth, async (req, res) => {
    try {
        const { data: entry } = await supabase
            .from('entries')
            .select('author')
            .eq('id', req.params.id)
            .single();

        if (!entry || entry.author !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const { data: updated, error } = await supabase
            .from('entries')
            .update({ visibility: 'draft' })
            .eq('id', req.params.id)
            .select()
            .single();
            
        if (error) throw error;
        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle like
router.post('/:id/like', auth, async (req, res) => {
    try {
        const { data: entry } = await supabase
            .from('entries')
            .select('id, author, likes, likes_count')
            .eq('id', req.params.id)
            .single();

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        const likes = entry.likes || [];
        const isLiked = likes.includes(req.user.id);
        
        let newLikes;
        let newCount;

        if (isLiked) {
            newLikes = likes.filter(id => id !== req.user.id);
            newCount = Math.max(0, (entry.likes_count || 1) - 1);
        } else {
            newLikes = [...likes, req.user.id];
            newCount = (entry.likes_count || 0) + 1;

            await createNotification({
                recipient: entry.author,
                sender: req.user.id,
                type: 'like',
                message: 'liked your entry',
                link: `/entry/${entry.id}`
            });
        }

        await supabase
            .from('entries')
            .update({ likes: newLikes, likes_count: newCount })
            .eq('id', entry.id);

        res.json({ isLiked: !isLiked, likesCount: newCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List entries by shelf
router.get('/shelf/:shelfId', optionalAuth, async (req, res) => {
    try {
        const { data: shelf } = await supabase
            .from('shelves')
            .select('owner')
            .eq('id', req.params.shelfId)
            .single();

        if (!shelf) {
            return res.status(404).json({ error: 'Shelf not found' });
        }

        const isOwner = req.user && req.user.id === shelf.owner;
        
        let query = supabase
            .from('entries')
            .select('*, author:profiles!entries_author_fkey(id, username, display_name, avatar)')
            .eq('shelf', req.params.shelfId)
            .order('order', { ascending: true });
            
        if (!isOwner) {
            query = query.eq('visibility', 'published');
        }

        const { data: entries, error } = await query;
        if (error) throw error;

        const mapped = (entries || []).map(e => ({
            ...e,
            _id: e.id,
            wordCount: e.word_count,
            createdAt: e.created_at,
            author: e.author ? { ...e.author, _id: e.author.id, displayName: e.author.display_name } : null
        }));

        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete entry
router.delete('/:id', auth, async (req, res) => {
    try {
        const { data: entry } = await supabase
            .from('entries')
            .select('author')
            .eq('id', req.params.id)
            .single();

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        if (entry.author !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { error } = await supabase
            .from('entries')
            .delete()
            .eq('id', req.params.id);
            
        if (error) throw error;

        res.json({ message: 'Entry deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
