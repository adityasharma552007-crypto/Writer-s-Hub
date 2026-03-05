const router = require('express').Router();
const Comment = require('../models/Comment');
const Entry = require('../models/Entry');
const { auth } = require('../middleware/auth');
const { createNotification } = require('../utils/notify');

// Create comment
router.post('/', auth, async (req, res) => {
    try {
        const { entryId, body, parentComment } = req.body;

        const entry = await Entry.findById(entryId);
        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        if (!entry.commentsEnabled) {
            return res.status(403).json({ error: 'Comments are disabled for this entry' });
        }

        const comment = await Comment.create({
            entry: entryId,
            author: req.user.id,
            body,
            parentComment: parentComment || null
        });

        await comment.populate('author', 'username displayName avatar');

        await createNotification({
            recipient: entry.author,
            sender: req.user.id,
            type: 'comment',
            message: 'commented on your entry',
            link: `/entry/${entryId}`
        });

        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List comments for entry
router.get('/entry/:entryId', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const comments = await Comment.find({ entry: req.params.entryId })
            .populate('author', 'username displayName avatar')
            .sort({ pinned: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Comment.countDocuments({ entry: req.params.entryId });

        res.json({
            comments,
            page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Pin comment (entry owner only)
router.put('/:id/pin', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const entry = await Entry.findById(comment.entry);
        if (entry.author.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Only entry owner can pin comments' });
        }

        comment.pinned = !comment.pinned;
        await comment.save();
        res.json(comment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete comment (author or entry owner)
router.delete('/:id', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const entry = await Entry.findById(comment.entry);
        const isCommentAuthor = comment.author.toString() === req.user.id;
        const isEntryOwner = entry.author.toString() === req.user.id;

        if (!isCommentAuthor && !isEntryOwner) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await Comment.findByIdAndDelete(comment._id);
        res.json({ message: 'Comment deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
