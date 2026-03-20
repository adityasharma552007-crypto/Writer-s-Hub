const router = require('express').Router();
const { supabase } = require('../supabaseClient');
const { auth } = require('../middleware/auth');
const { createNotification } = require('../utils/notify');

// Create post
router.post('/', auth, async (req, res) => {
    try {
        const { communityId, body, sharedEntry } = req.body;

        const { data: community } = await supabase
            .from('communities')
            .select('id, members')
            .eq('id', communityId)
            .single();

        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }
        if (!(community.members || []).includes(req.user.id)) {
            return res.status(403).json({ error: 'Must be a member to post' });
        }

        const { data: post, error } = await supabase
            .from('community_posts')
            .insert({
                community: communityId,
                author: req.user.id,
                body,
                shared_entry: sharedEntry || null
            })
            .select(`
                *,
                author:profiles!community_posts_author_fkey(id, username, display_name, avatar),
                shared_entry:entries!community_posts_shared_entry_fkey(
                    id, title, body, word_count,
                    author:profiles!entries_author_fkey(id, username, display_name)
                )
            `)
            .single();

        if (error) throw error;

        // Map response to match frontend expectations
        const mappedPost = {
            ...post,
            _id: post.id,
            sharedEntry: post.shared_entry ? {
                ...post.shared_entry,
                _id: post.shared_entry.id,
                wordCount: post.shared_entry.word_count,
                author: post.shared_entry.author ? {
                    ...post.shared_entry.author,
                    _id: post.shared_entry.author.id,
                    displayName: post.shared_entry.author.display_name
                } : null
            } : null,
            author: post.author ? {
                ...post.author,
                _id: post.author.id,
                displayName: post.author.display_name
            } : null
        };

        res.status(201).json(mappedPost);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List posts in community
router.get('/community/:communityId', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const start = (page - 1) * limit;
        const end = start + limit - 1;
        const filter = req.query.filter;

        let query = supabase
            .from('community_posts')
            .select(`
                *,
                author:profiles!community_posts_author_fkey(id, username, display_name, avatar),
                shared_entry:entries!community_posts_shared_entry_fkey(
                    id, title, body, word_count,
                    author:profiles!entries_author_fkey(id, username, display_name)
                )
            `, { count: 'exact' })
            .eq('community', req.params.communityId);

        if (filter === 'entryShares') {
            query = query.not('shared_entry', 'is', null);
        }

        const { data: posts, count, error } = await query
            .order('pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) throw error;

        const mapped = (posts || []).map(p => ({
            ...p,
            _id: p.id,
            createdAt: p.created_at,
            sharedEntry: p.shared_entry ? {
                ...p.shared_entry,
                _id: p.shared_entry.id,
                wordCount: p.shared_entry.word_count,
                author: p.shared_entry.author ? {
                    ...p.shared_entry.author,
                    _id: p.shared_entry.author.id,
                    displayName: p.shared_entry.author.display_name
                } : null
            } : null,
            author: p.author ? {
                ...p.author,
                _id: p.author.id,
                displayName: p.author.display_name
            } : null
        }));

        res.json({
            posts: mapped,
            page,
            totalPages: Math.ceil((count || 0) / limit),
            total: count || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Pin post (owner/mod)
router.put('/:id/pin', auth, async (req, res) => {
    try {
        // First get the post and community details
        const { data: postWithCommunity, error: fetchError } = await supabase
            .from('community_posts')
            .select(`
                id, pinned, community,
                community_details:communities!community_posts_community_fkey(owner, moderators)
            `)
            .eq('id', req.params.id)
            .single();

        if (fetchError || !postWithCommunity) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const community = postWithCommunity.community_details;
        const isOwner = community.owner === req.user.id;
        const isMod = (community.moderators || []).includes(req.user.id);
        
        if (!isOwner && !isMod) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { data: updatedPost, error } = await supabase
            .from('community_posts')
            .update({ pinned: !postWithCommunity.pinned })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json({ ...updatedPost, _id: updatedPost.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Like post
router.post('/:id/like', auth, async (req, res) => {
    try {
        const { data: post, error: fetchError } = await supabase
            .from('community_posts')
            .select('id, likes')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const likes = post.likes || [];
        const isLiked = likes.includes(req.user.id);
        const newLikes = isLiked 
            ? likes.filter(id => id !== req.user.id)
            : [...likes, req.user.id];

        const { error } = await supabase
            .from('community_posts')
            .update({ likes: newLikes })
            .eq('id', req.params.id);

        if (error) throw error;
        
        res.json({ isLiked: !isLiked, likesCount: newLikes.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
    try {
        const { data: postWithCommunity, error: fetchError } = await supabase
            .from('community_posts')
            .select(`
                id, author,
                community_details:communities!community_posts_community_fkey(owner, moderators)
            `)
            .eq('id', req.params.id)
            .single();

        if (fetchError || !postWithCommunity) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const community = postWithCommunity.community_details;
        const isAuthor = postWithCommunity.author === req.user.id;
        const isOwner = community.owner === req.user.id;
        const isMod = (community.moderators || []).includes(req.user.id);

        if (!isAuthor && !isOwner && !isMod) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { error } = await supabase
            .from('community_posts')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Post deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
