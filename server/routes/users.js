const router = require('express').Router();
const { supabase } = require('../supabaseClient');
const { auth, optionalAuth } = require('../middleware/auth');
const { uploadAvatar, uploadCover } = require('../middleware/upload');
const { createNotification } = require('../utils/notify');

// Get user profile by username
router.get('/:username', optionalAuth, async (req, res) => {
    try {
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', req.params.username)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get public shelves (or all if owner)
        const isOwner = req.user && req.user.id === user.id;
        
        let shelfQuery = supabase
            .from('shelves')
            .select('*')
            .eq('owner', user.id)
            .order('order', { ascending: true });
            
        if (!isOwner) {
            shelfQuery = shelfQuery.eq('visibility', 'public').eq('archived', false);
        }
        
        const { data: shelves } = await shelfQuery;

        res.json({
            user: { ...user, _id: user.id },
            shelves: shelves ? shelves.map(s => ({ ...s, _id: s.id, coverImage: s.cover_image, genreTags: s.genre_tags })) : [],
            isOwner,
            followerCount: (user.followers || []).length,
            followingCount: (user.following || []).length,
            isFollowing: req.user ? (user.followers || []).includes(req.user.id) : false
        });
    } catch (error) {
        console.error('[Users API]', error);
        res.status(500).json({ error: error.message });
    }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
    try {
        const allowedUpdates = {
            displayName: 'display_name',
            bio: 'bio',
            genreTags: 'genre_tags'
        };
        
        const updates = {};
        for (const [clientKey, dbKey] of Object.entries(allowedUpdates)) {
            if (req.body[clientKey] !== undefined) {
                updates[dbKey] = req.body[clientKey];
            }
        }

        const { data: user, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', req.user.id)
            .select()
            .single();

        if (error) throw error;
        res.json({ ...user, _id: user.id });
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
        const filePath = `/uploads/${req.file.filename}`;
        
        const { data: user, error } = await supabase
            .from('profiles')
            .update({ avatar: filePath })
            .eq('id', req.user.id)
            .select()
            .single();
            
        if (error) throw error;
        res.json({ ...user, _id: user.id });
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
        const filePath = `/uploads/${req.file.filename}`;
        
        const { data: user, error } = await supabase
            .from('profiles')
            .update({ banner: filePath })
            .eq('id', req.user.id)
            .select()
            .single();
            
        if (error) throw error;
        res.json({ ...user, _id: user.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Follow user
router.post('/:username/follow', auth, async (req, res) => {
    try {
        const { data: targetUser } = await supabase
            .from('profiles')
            .select('id, followers')
            .ilike('username', req.params.username)
            .single();

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (targetUser.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        const followers = targetUser.followers || [];
        if (followers.includes(req.user.id)) {
            return res.status(400).json({ error: 'Already following this user' });
        }

        // Add to target user's followers
        await supabase.from('profiles').update({ 
            followers: [...followers, req.user.id] 
        }).eq('id', targetUser.id);

        // Add to current user's following
        const { data: currentUser } = await supabase
            .from('profiles')
            .select('id, username, display_name, following')
            .eq('id', req.user.id)
            .single();
            
        const following = currentUser.following || [];
        await supabase.from('profiles').update({ 
            following: [...following, targetUser.id] 
        }).eq('id', req.user.id);

        await createNotification({
            recipient: targetUser.id,
            sender: req.user.id,
            type: 'follow',
            message: `${currentUser.display_name || currentUser.username} started following you`,
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
        const { data: targetUser } = await supabase
            .from('profiles')
            .select('id, followers')
            .ilike('username', req.params.username)
            .single();

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const followers = (targetUser.followers || []).filter(id => id !== req.user.id);
        await supabase.from('profiles').update({ followers }).eq('id', targetUser.id);

        const { data: currentUser } = await supabase
            .from('profiles')
            .select('following')
            .eq('id', req.user.id)
            .single();
            
        const following = (currentUser.following || []).filter(id => id !== targetUser.id);
        await supabase.from('profiles').update({ following }).eq('id', req.user.id);

        res.json({ message: 'Unfollowed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update password (Disabled: Now handled directly by Supabase Auth on the frontend)
router.put('/password', auth, async (req, res) => {
    res.status(400).json({ error: 'Password updates should be handled via Supabase client' });
});

// Deactivate account (Disabled: Handled differently in Supabase mapping)
router.put('/deactivate', auth, async (req, res) => {
    res.status(400).json({ error: 'Account deactivation should be handled via Supabase API' });
});

module.exports = router;
