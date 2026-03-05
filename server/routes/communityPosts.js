const router = require('express').Router();
const CommunityPost = require('../models/CommunityPost');
const Community = require('../models/Community');
const { auth } = require('../middleware/auth');
const { createNotification } = require('../utils/notify');

// Create post
router.post('/', auth, async (req, res) => {
    try {
        const { communityId, body, sharedEntry } = req.body;

        const community = await Community.findById(communityId);
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }
        if (!community.members.includes(req.user.id)) {
            return res.status(403).json({ error: 'Must be a member to post' });
        }

        const post = await CommunityPost.create({
            community: communityId,
            author: req.user.id,
            body,
            sharedEntry: sharedEntry || null
        });

        await post.populate('author', 'username displayName avatar');
        if (post.sharedEntry) {
            await post.populate({
                path: 'sharedEntry',
                select: 'title body wordCount author',
                populate: { path: 'author', select: 'username displayName' }
            });
        }

        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List posts in community
router.get('/community/:communityId', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const filter = req.query.filter;

        const query = { community: req.params.communityId };
        if (filter === 'entryShares') {
            query.sharedEntry = { $ne: null };
        }

        const posts = await CommunityPost.find(query)
            .populate('author', 'username displayName avatar')
            .populate({
                path: 'sharedEntry',
                select: 'title body wordCount author',
                populate: { path: 'author', select: 'username displayName' }
            })
            .sort({ pinned: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await CommunityPost.countDocuments(query);

        res.json({
            posts,
            page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Pin post (owner/mod)
router.put('/:id/pin', auth, async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const community = await Community.findById(post.community);
        const isOwner = community.owner.toString() === req.user.id;
        const isMod = community.moderators.includes(req.user.id);
        if (!isOwner && !isMod) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        post.pinned = !post.pinned;
        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Like post
router.post('/:id/like', auth, async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const isLiked = post.likes.includes(req.user.id);
        if (isLiked) {
            post.likes.pull(req.user.id);
        } else {
            post.likes.push(req.user.id);
        }

        await post.save();
        res.json({ isLiked: !isLiked, likesCount: post.likes.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const community = await Community.findById(post.community);
        const isAuthor = post.author.toString() === req.user.id;
        const isOwner = community.owner.toString() === req.user.id;
        const isMod = community.moderators.includes(req.user.id);

        if (!isAuthor && !isOwner && !isMod) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await CommunityPost.findByIdAndDelete(post._id);
        res.json({ message: 'Post deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
