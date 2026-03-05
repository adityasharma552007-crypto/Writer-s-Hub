const router = require('express').Router();
const Shelf = require('../models/Shelf');
const Entry = require('../models/Entry');
const { auth, optionalAuth } = require('../middleware/auth');
const { uploadCover } = require('../middleware/upload');

// Create shelf
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, visibility, status, genreTags } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const count = await Shelf.countDocuments({ owner: req.user.id });
        const shelf = await Shelf.create({
            owner: req.user.id,
            title,
            description,
            visibility,
            status,
            genreTags,
            order: count
        });

        res.status(201).json(shelf);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get shelves by user
router.get('/user/:userId', optionalAuth, async (req, res) => {
    try {
        const query = { owner: req.params.userId };
        const isOwner = req.user && req.user.id === req.params.userId;
        if (!isOwner) {
            query.visibility = 'public';
            query.archived = false;
        }

        const shelves = await Shelf.find(query).sort({ order: 1 });
        res.json(shelves);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single shelf with entries
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const shelf = await Shelf.findById(req.params.id).populate('owner', 'username displayName avatar');
        if (!shelf) {
            return res.status(404).json({ error: 'Shelf not found' });
        }

        const isOwner = req.user && req.user.id === shelf.owner._id.toString();
        if (!isOwner && shelf.visibility !== 'public') {
            return res.status(404).json({ error: 'Shelf not found' });
        }

        const entryQuery = { shelf: shelf._id };
        if (!isOwner) {
            entryQuery.visibility = 'published';
        }

        const entries = await Entry.find(entryQuery)
            .select('title wordCount visibility tags createdAt updatedAt order likesCount')
            .sort({ order: 1 });

        res.json({ shelf, entries, isOwner });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update shelf
router.put('/:id', auth, async (req, res) => {
    try {
        const shelf = await Shelf.findById(req.params.id);
        if (!shelf) {
            return res.status(404).json({ error: 'Shelf not found' });
        }
        if (shelf.owner.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const allowedUpdates = ['title', 'description', 'visibility', 'status', 'genreTags', 'archived'];
        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) {
                shelf[key] = req.body[key];
            }
        }

        await shelf.save();
        res.json(shelf);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload shelf cover
router.post('/:id/cover', auth, uploadCover, async (req, res) => {
    try {
        const shelf = await Shelf.findById(req.params.id);
        if (!shelf || shelf.owner.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        shelf.coverImage = `/uploads/${req.file.filename}`;
        await shelf.save();
        res.json(shelf);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reorder shelves
router.put('/reorder', auth, async (req, res) => {
    try {
        const { shelfIds } = req.body;
        for (let i = 0; i < shelfIds.length; i++) {
            await Shelf.findOneAndUpdate(
                { _id: shelfIds[i], owner: req.user.id },
                { order: i }
            );
        }
        res.json({ message: 'Shelves reordered' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete shelf (cascade entries)
router.delete('/:id', auth, async (req, res) => {
    try {
        const shelf = await Shelf.findById(req.params.id);
        if (!shelf) {
            return res.status(404).json({ error: 'Shelf not found' });
        }
        if (shelf.owner.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await Entry.deleteMany({ shelf: shelf._id });
        await Shelf.findByIdAndDelete(shelf._id);

        res.json({ message: 'Shelf and entries deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
