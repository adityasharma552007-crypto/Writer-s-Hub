const router = require('express').Router();
const Entry = require('../models/Entry');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Get personalized feed
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const user = await User.findById(req.user.id);
        const following = user.following || [];

        // Following feed
        const followingEntries = await Entry.find({
            author: { $in: following },
            visibility: 'published'
        })
            .populate('author', 'username displayName avatar')
            .populate('shelf', 'title')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Trending (most liked in last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const trending = await Entry.find({
            visibility: 'published',
            createdAt: { $gte: sevenDaysAgo }
        })
            .populate('author', 'username displayName avatar')
            .populate('shelf', 'title')
            .sort({ likesCount: -1 })
            .limit(10);

        // Suggestions based on user genre tags
        let suggestions = [];
        if (user.genreTags && user.genreTags.length > 0) {
            suggestions = await Entry.find({
                visibility: 'published',
                tags: { $in: user.genreTags },
                author: { $nin: [...following, req.user.id] }
            })
                .populate('author', 'username displayName avatar')
                .populate('shelf', 'title')
                .sort({ likesCount: -1, createdAt: -1 })
                .limit(10);
        }

        res.json({
            following: followingEntries,
            trending,
            suggestions,
            page
        });
    } catch (error) {
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
        const dateThreshold = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

        const query = {
            visibility: 'published',
            createdAt: { $gte: dateThreshold }
        };

        if (genre) {
            query.tags = genre;
        }

        const entries = await Entry.find(query)
            .populate('author', 'username displayName avatar')
            .populate('shelf', 'title')
            .sort({ likesCount: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Entry.countDocuments(query);

        res.json({
            entries,
            page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
