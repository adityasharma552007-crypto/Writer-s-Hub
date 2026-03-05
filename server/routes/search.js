const router = require('express').Router();
const User = require('../models/User');
const Entry = require('../models/Entry');
const Shelf = require('../models/Shelf');
const Community = require('../models/Community');

// Search across types
router.get('/', async (req, res) => {
    try {
        const { q, type } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        if (!q || !q.trim()) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const regex = new RegExp(q.trim(), 'i');
        const results = {};

        // Search creators
        if (!type || type === 'creators') {
            const creators = await User.find({
                $or: [
                    { username: regex },
                    { displayName: regex },
                    { bio: regex }
                ],
                deactivated: false
            })
                .select('username displayName avatar bio genreTags followers')
                .skip(skip)
                .limit(limit);
            results.creators = creators;
        }

        // Search entries
        if (!type || type === 'entries') {
            const entries = await Entry.find({
                $or: [
                    { title: regex },
                    { tags: regex }
                ],
                visibility: 'published'
            })
                .populate('author', 'username displayName avatar')
                .populate('shelf', 'title')
                .select('title wordCount tags createdAt likesCount')
                .skip(skip)
                .limit(limit);
            results.entries = entries;
        }

        // Search shelves
        if (!type || type === 'shelves') {
            const shelves = await Shelf.find({
                $or: [
                    { title: regex },
                    { description: regex },
                    { genreTags: regex }
                ],
                visibility: 'public',
                archived: false
            })
                .populate('owner', 'username displayName avatar')
                .skip(skip)
                .limit(limit);
            results.shelves = shelves;
        }

        // Search communities
        if (!type || type === 'communities') {
            const communities = await Community.find({
                $or: [
                    { name: regex },
                    { description: regex },
                    { category: regex }
                ],
                privacy: { $ne: 'hidden' }
            })
                .select('name description coverImage category members privacy isOfficial')
                .skip(skip)
                .limit(limit);
            results.communities = communities;
        }

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
