const router = require('express').Router();
const Community = require('../models/Community');
const { auth, optionalAuth } = require('../middleware/auth');
const { uploadCover } = require('../middleware/upload');
const { createNotification } = require('../utils/notify');

// Create community
router.post('/', auth, async (req, res) => {
    try {
        const { name, description, category, privacy, rules } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Community name is required' });
        }

        const community = await Community.create({
            name,
            description,
            category,
            privacy,
            rules: rules || [],
            owner: req.user.id,
            members: [req.user.id]
        });

        res.status(201).json(community);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Community name already taken' });
        }
        res.status(500).json({ error: error.message });
    }
});

// List communities
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const search = req.query.search;
        const category = req.query.category;

        const query = { privacy: { $ne: 'hidden' } };
        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') }
            ];
        }
        if (category) {
            query.category = category;
        }

        const communities = await Community.find(query)
            .populate('owner', 'username displayName avatar')
            .sort({ members: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Community.countDocuments(query);

        res.json({
            communities,
            page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single community
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id)
            .populate('owner', 'username displayName avatar')
            .populate('moderators', 'username displayName avatar')
            .populate('members', 'username displayName avatar');

        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        const isMember = req.user ? community.members.some(m => m._id.toString() === req.user.id) : false;
        const isOwner = req.user ? community.owner._id.toString() === req.user.id : false;
        const isModerator = req.user ? community.moderators.some(m => m._id.toString() === req.user.id) : false;

        res.json({
            community,
            isMember,
            isOwner,
            isModerator,
            memberCount: community.members.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update community
router.put('/:id', auth, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }
        if (community.owner.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const allowedUpdates = ['name', 'description', 'category', 'privacy', 'rules'];
        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) {
                community[key] = req.body[key];
            }
        }

        await community.save();
        res.json(community);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload community cover
router.post('/:id/cover', auth, uploadCover, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (!community || community.owner.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        community.coverImage = `/uploads/${req.file.filename}`;
        await community.save();
        res.json(community);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Join community
router.post('/:id/join', auth, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        if (community.members.includes(req.user.id)) {
            return res.status(400).json({ error: 'Already a member' });
        }

        if (community.privacy === 'private') {
            if (!community.pendingMembers.includes(req.user.id)) {
                community.pendingMembers.push(req.user.id);
                await community.save();
            }
            return res.json({ message: 'Join request sent', pending: true });
        }

        community.members.push(req.user.id);
        await community.save();

        await createNotification({
            recipient: community.owner,
            sender: req.user.id,
            type: 'community_join',
            message: 'joined your community',
            link: `/communities/${community._id}`
        });

        res.json({ message: 'Joined community' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Leave community
router.post('/:id/leave', auth, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }
        if (community.owner.toString() === req.user.id) {
            return res.status(400).json({ error: 'Owner cannot leave the community' });
        }

        community.members.pull(req.user.id);
        community.moderators.pull(req.user.id);
        await community.save();

        res.json({ message: 'Left community' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add moderator
router.post('/:id/moderators/:userId', auth, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (!community || community.owner.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        if (!community.members.includes(req.params.userId)) {
            return res.status(400).json({ error: 'User is not a member' });
        }
        if (!community.moderators.includes(req.params.userId)) {
            community.moderators.push(req.params.userId);
            await community.save();
        }
        res.json({ message: 'Moderator added' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove member (owner/mod)
router.delete('/:id/members/:userId', auth, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        const isOwner = community.owner.toString() === req.user.id;
        const isMod = community.moderators.includes(req.user.id);
        if (!isOwner && !isMod) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        if (community.owner.toString() === req.params.userId) {
            return res.status(400).json({ error: 'Cannot remove the owner' });
        }

        community.members.pull(req.params.userId);
        community.moderators.pull(req.params.userId);
        await community.save();

        res.json({ message: 'Member removed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete community
router.delete('/:id', auth, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }
        if (community.isOfficial) {
            return res.status(403).json({ error: 'Official communities cannot be deleted' });
        }
        if (community.owner.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const CommunityPost = require('../models/CommunityPost');
        await CommunityPost.deleteMany({ community: community._id });
        await Community.findByIdAndDelete(community._id);

        res.json({ message: 'Community deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve pending member (owner/mod for private communities)
router.post('/:id/approve/:userId', auth, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }
        const isOwner = community.owner.toString() === req.user.id;
        const isMod = community.moderators.includes(req.user.id);
        if (!isOwner && !isMod) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        community.pendingMembers.pull(req.params.userId);
        if (!community.members.includes(req.params.userId)) {
            community.members.push(req.params.userId);
        }
        await community.save();

        res.json({ message: 'Member approved' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
