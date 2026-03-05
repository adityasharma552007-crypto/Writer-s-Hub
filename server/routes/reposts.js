const router = require('express').Router();
const Repost = require('../models/Repost');
const Entry = require('../models/Entry');
const { auth } = require('../middleware/auth');
const { createNotification } = require('../utils/notify');

// Create repost
router.post('/:entryId', auth, async (req, res) => {
    try {
        const entry = await Entry.findById(req.params.entryId)
            .populate('author', 'username displayName');

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        if (!entry.repostsEnabled) {
            return res.status(403).json({ error: 'Reposts are disabled for this entry' });
        }
        if (entry.author._id.toString() === req.user.id) {
            return res.status(400).json({ error: 'Cannot repost your own entry' });
        }

        const repost = await Repost.create({
            reposter: req.user.id,
            originalEntry: entry._id,
            originalAuthor: entry.author._id
        });

        const User = require('../models/User');
        const reposter = await User.findById(req.user.id).select('displayName username');
        await createNotification({
            recipient: entry.author._id,
            sender: req.user.id,
            type: 'repost',
            message: `${reposter.displayName || reposter.username} reposted your entry "${entry.title}"`,
            link: `/entry/${entry._id}`
        });

        res.status(201).json(repost);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Already reposted' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Delete repost
router.delete('/:entryId', auth, async (req, res) => {
    try {
        await Repost.findOneAndDelete({
            reposter: req.user.id,
            originalEntry: req.params.entryId
        });
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
        const skip = (page - 1) * limit;

        const reposts = await Repost.find({ reposter: req.params.userId })
            .populate({
                path: 'originalEntry',
                select: 'title body wordCount createdAt likesCount shelf',
                populate: { path: 'shelf', select: 'title' }
            })
            .populate('originalAuthor', 'username displayName avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Repost.countDocuments({ reposter: req.params.userId });
        res.json({ reposts, page, totalPages: Math.ceil(total / limit), total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check if entry is reposted by user
router.get('/check/:entryId', auth, async (req, res) => {
    try {
        const repost = await Repost.findOne({
            reposter: req.user.id,
            originalEntry: req.params.entryId
        });
        res.json({ isReposted: !!repost });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
