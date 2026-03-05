const router = require('express').Router();
const Bookmark = require('../models/Bookmark');
const { auth } = require('../middleware/auth');

// Add bookmark
router.post('/:entryId', auth, async (req, res) => {
    try {
        const bookmark = await Bookmark.create({
            user: req.user.id,
            entry: req.params.entryId
        });
        res.status(201).json(bookmark);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Already bookmarked' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Remove bookmark
router.delete('/:entryId', auth, async (req, res) => {
    try {
        await Bookmark.findOneAndDelete({
            user: req.user.id,
            entry: req.params.entryId
        });
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
        const skip = (page - 1) * limit;

        const bookmarks = await Bookmark.find({ user: req.user.id })
            .populate({
                path: 'entry',
                select: 'title author shelf wordCount createdAt likesCount',
                populate: [
                    { path: 'author', select: 'username displayName avatar' },
                    { path: 'shelf', select: 'title' }
                ]
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Bookmark.countDocuments({ user: req.user.id });

        res.json({
            bookmarks,
            page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check if entry is bookmarked
router.get('/check/:entryId', auth, async (req, res) => {
    try {
        const bookmark = await Bookmark.findOne({
            user: req.user.id,
            entry: req.params.entryId
        });
        res.json({ isBookmarked: !!bookmark });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
