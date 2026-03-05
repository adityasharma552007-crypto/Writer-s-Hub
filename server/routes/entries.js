const router = require('express').Router();
const Entry = require('../models/Entry');
const Shelf = require('../models/Shelf');
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

        const shelfDoc = await Shelf.findById(shelf);
        if (!shelfDoc || shelfDoc.owner.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to add to this shelf' });
        }

        const count = await Entry.countDocuments({ shelf });
        const entry = await Entry.create({
            shelf,
            author: req.user.id,
            title,
            body: body || '',
            wordCount: countWords(body || ''),
            order: count,
            authorNote,
            tags,
            contentWarnings,
            visibility: visibility || 'draft'
        });

        res.status(201).json(entry);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single entry
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const entry = await Entry.findById(req.params.id)
            .populate('author', 'username displayName avatar')
            .populate('shelf', 'title');

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        const isOwner = req.user && req.user.id === entry.author._id.toString();
        if (!isOwner && entry.visibility === 'draft') {
            return res.status(404).json({ error: 'Entry not found' });
        }

        // Get prev/next entries in same shelf
        const siblings = await Entry.find({
            shelf: entry.shelf._id,
            visibility: isOwner ? { $in: ['draft', 'published', 'scheduled', 'unlisted'] } : 'published'
        }).select('_id title order').sort({ order: 1 });

        const currentIndex = siblings.findIndex(s => s._id.toString() === entry._id.toString());
        const prevEntry = currentIndex > 0 ? siblings[currentIndex - 1] : null;
        const nextEntry = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

        res.json({
            entry,
            isOwner,
            isLiked: req.user ? entry.likedBy.includes(req.user.id) : false,
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
        const entry = await Entry.findById(req.params.id);
        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        if (entry.author.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { title, body, authorNote, tags, contentWarnings, visibility, scheduledAt, revisionNote } = req.body;

        // Log title change
        if (title && title !== entry.title) {
            entry.titleHistory.push({ oldTitle: entry.title, changedAt: new Date() });
            entry.title = title;
        }

        if (body !== undefined) {
            entry.body = body;
            entry.wordCount = countWords(body);
        }
        if (authorNote !== undefined) entry.authorNote = authorNote;
        if (tags !== undefined) entry.tags = tags;
        if (contentWarnings !== undefined) entry.contentWarnings = contentWarnings;
        if (visibility !== undefined) entry.visibility = visibility;
        if (scheduledAt !== undefined) entry.scheduledAt = scheduledAt;

        if (revisionNote) {
            entry.revisionNotes.push({ note: revisionNote, date: new Date() });
        }

        await entry.save();
        res.json(entry);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Publish entry (with plagiarism check)
router.post('/:id/publish', auth, async (req, res) => {
    try {
        const entry = await Entry.findById(req.params.id);
        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        if (entry.author.toString() !== req.user.id) {
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

        entry.contentHash = generateHash(entry.body);
        entry.visibility = 'published';
        await entry.save();

        // Notify followers
        const User = require('../models/User');
        const author = await User.findById(req.user.id);
        if (author && author.followers.length > 0) {
            for (const followerId of author.followers) {
                await createNotification({
                    recipient: followerId,
                    sender: req.user.id,
                    type: 'publish',
                    message: `${author.displayName || author.username} published "${entry.title}"`,
                    link: `/entry/${entry._id}`
                });
            }
        }

        res.json(entry);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Unpublish entry
router.post('/:id/unpublish', auth, async (req, res) => {
    try {
        const entry = await Entry.findById(req.params.id);
        if (!entry || entry.author.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        entry.visibility = 'draft';
        await entry.save();
        res.json(entry);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle like
router.post('/:id/like', auth, async (req, res) => {
    try {
        const entry = await Entry.findById(req.params.id);
        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        const isLiked = entry.likedBy.includes(req.user.id);
        if (isLiked) {
            entry.likedBy.pull(req.user.id);
            entry.likesCount = Math.max(0, entry.likesCount - 1);
        } else {
            entry.likedBy.push(req.user.id);
            entry.likesCount += 1;

            await createNotification({
                recipient: entry.author,
                sender: req.user.id,
                type: 'like',
                message: 'liked your entry',
                link: `/entry/${entry._id}`
            });
        }

        await entry.save();
        res.json({ isLiked: !isLiked, likesCount: entry.likesCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List entries by shelf
router.get('/shelf/:shelfId', optionalAuth, async (req, res) => {
    try {
        const shelf = await Shelf.findById(req.params.shelfId);
        if (!shelf) {
            return res.status(404).json({ error: 'Shelf not found' });
        }

        const isOwner = req.user && req.user.id === shelf.owner.toString();
        const query = { shelf: shelf._id };
        if (!isOwner) {
            query.visibility = 'published';
        }

        const entries = await Entry.find(query)
            .populate('author', 'username displayName avatar')
            .sort({ order: 1 });

        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete entry
router.delete('/:id', auth, async (req, res) => {
    try {
        const entry = await Entry.findById(req.params.id);
        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        if (entry.author.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await Entry.findByIdAndDelete(entry._id);
        res.json({ message: 'Entry deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
