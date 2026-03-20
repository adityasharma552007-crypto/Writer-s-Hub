const router = require('express').Router();
const { supabase } = require('../supabaseClient');
const { auth } = require('../middleware/auth');
const { createNotification } = require('../utils/notify');

// Create comment
router.post('/', auth, async (req, res) => {
    try {
        const { entryId, body, parentComment } = req.body;

        const { data: entry } = await supabase
            .from('entries')
            .select('id, author, comments_enabled')
            .eq('id', entryId)
            .single();

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        if (entry.comments_enabled === false) { // note: check explicit false in case null means true by default
            return res.status(403).json({ error: 'Comments are disabled for this entry' });
        }

        const { data: comment, error } = await supabase
            .from('comments')
            .insert({
                entry: entryId,
                author: req.user.id,
                body,
                parent_comment: parentComment || null
            })
            .select('*, author:profiles!comments_author_fkey(id, username, display_name, avatar)')
            .single();

        if (error) throw error;

        await createNotification({
            recipient: entry.author,
            sender: req.user.id,
            type: 'comment',
            message: 'commented on your entry',
            link: `/entry/${entryId}`
        });

        res.status(201).json({
            ...comment,
            _id: comment.id,
            parentComment: comment.parent_comment,
            createdAt: comment.created_at,
            author: { ...comment.author, _id: comment.author.id, displayName: comment.author.display_name }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List comments for entry
router.get('/entry/:entryId', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const start = (page - 1) * limit;
        const end = start + limit - 1;

        const { data: comments, count, error } = await supabase
            .from('comments')
            .select('*, author:profiles!comments_author_fkey(id, username, display_name, avatar)', { count: 'exact' })
            .eq('entry', req.params.entryId)
            .order('pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) throw error;

        const mapped = (comments || []).map(c => ({
            ...c,
            _id: c.id,
            parentComment: c.parent_comment,
            createdAt: c.created_at,
            author: c.author ? { ...c.author, _id: c.author.id, displayName: c.author.display_name } : null
        }));

        res.json({
            comments: mapped,
            page,
            totalPages: Math.ceil((count || 0) / limit),
            total: count || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Pin comment (entry owner only)
router.put('/:id/pin', auth, async (req, res) => {
    try {
        const { data: comment } = await supabase
            .from('comments')
            .select('id, entry, pinned')
            .eq('id', req.params.id)
            .single();

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const { data: entry } = await supabase
            .from('entries')
            .select('author')
            .eq('id', comment.entry)
            .single();

        if (!entry || entry.author !== req.user.id) {
            return res.status(403).json({ error: 'Only entry owner can pin comments' });
        }

        const { data: updated, error } = await supabase
            .from('comments')
            .update({ pinned: !comment.pinned })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json({ ...updated, _id: updated.id, parentComment: updated.parent_comment });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete comment (author or entry owner)
router.delete('/:id', auth, async (req, res) => {
    try {
        const { data: comment } = await supabase
            .from('comments')
            .select('id, entry, author')
            .eq('id', req.params.id)
            .single();

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const { data: entry } = await supabase
            .from('entries')
            .select('author')
            .eq('id', comment.entry)
            .single();

        const isCommentAuthor = comment.author === req.user.id;
        const isEntryOwner = entry && entry.author === req.user.id;

        if (!isCommentAuthor && !isEntryOwner) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Comment deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
