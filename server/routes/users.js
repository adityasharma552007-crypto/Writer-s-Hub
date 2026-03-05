const router = require('express').Router();
const User = require('../models/User');
const Shelf = require('../models/Shelf');
const { auth, optionalAuth } = require('../middleware/auth');
const { uploadAvatar, uploadCover } = require('../middleware/upload');
const { createNotification } = require('../utils/notify');

// Get user profile by username
router.get('/:username', optionalAuth, async (req, res) => {
    try {
        const user = await User.findOne({
            username: req.params.username.toLowerCase(),
            deactivated: false
        }).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get public shelves (or all if owner)
        const isOwner = req.user && req.user.id === user._id.toString();
        const shelfQuery = { owner: user._id };
        if (!isOwner) {
            shelfQuery.visibility = 'public';
            shelfQuery.archived = false;
        }
        const shelves = await Shelf.find(shelfQuery).sort({ order: 1 });

        res.json({
            user,
            shelves,
            isOwner,
            followerCount: user.followers.length,
            followingCount: user.following.length,
            isFollowing: req.user ? user.followers.includes(req.user.id) : false
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
    try {
        const allowedUpdates = [
            'displayName', 'bio', 'genreTags', 'socialLinks',
            'showStats', 'theme', 'privacySettings', 'notificationSettings'
        ];
        const updates = {};
        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        const user = await User.findByIdAndUpdate(req.user.id, updates, {
            new: true, runValidators: true
        }).select('-password');

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload avatar
router.post('/avatar', auth, uploadAvatar, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { avatar: `/uploads/${req.file.filename}` },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload banner
router.post('/banner', auth, uploadCover, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { banner: `/uploads/${req.file.filename}` },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Follow user
router.post('/:username/follow', auth, async (req, res) => {
    try {
        const targetUser = await User.findOne({ username: req.params.username.toLowerCase() });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (targetUser._id.toString() === req.user.id) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        if (targetUser.followers.includes(req.user.id)) {
            return res.status(400).json({ error: 'Already following this user' });
        }

        await User.findByIdAndUpdate(targetUser._id, { $push: { followers: req.user.id } });
        await User.findByIdAndUpdate(req.user.id, { $push: { following: targetUser._id } });

        const currentUser = await User.findById(req.user.id).select('displayName username');
        await createNotification({
            recipient: targetUser._id,
            sender: req.user.id,
            type: 'follow',
            message: `${currentUser.displayName || currentUser.username} started following you`,
            link: `/profile/${currentUser.username}`
        });

        res.json({ message: 'Followed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Unfollow user
router.delete('/:username/follow', auth, async (req, res) => {
    try {
        const targetUser = await User.findOne({ username: req.params.username.toLowerCase() });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        await User.findByIdAndUpdate(targetUser._id, { $pull: { followers: req.user.id } });
        await User.findByIdAndUpdate(req.user.id, { $pull: { following: targetUser._id } });

        res.json({ message: 'Unfollowed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update password
router.put('/password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Deactivate account
router.put('/deactivate', auth, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { deactivated: true });
        res.json({ message: 'Account deactivated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
