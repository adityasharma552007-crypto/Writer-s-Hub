const router = require('express').Router();
const { supabase } = require('../supabaseClient');
const { auth } = require('../middleware/auth');

// Sync new user from Supabase to our profiles table
router.post('/sync', auth, async (req, res) => {
    try {
        const { username, displayName } = req.body;

        // The token is already verified by our auth middleware
        const email = req.user.email;
        const userId = req.user.id;

        if (!email || !username) {
            return res.status(400).json({ error: 'Email and username are required for sync' });
        }

        // Check if profile already exists
        let { data: user } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!user) {
            // Check if username is taken by another account
            const { data: existingUsername } = await supabase
                .from('profiles')
                .select('id')
                .ilike('username', username)
                .single();

            if (existingUsername) {
                return res.status(400).json({ error: 'Username already taken' });
            }

            // Create new profile record linked to the Supabase auth.users UUID
            const { data: newUser, error } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    username: username.toLowerCase(),
                    display_name: displayName || username,
                    email: email
                })
                .select()
                .single();

            if (error) throw error;
            user = newUser;
        }

        res.status(200).json({
            ...user,
            _id: user.id,
            displayName: user.display_name
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();
            
        if (error || !user) {
            return res.status(404).json({ error: 'User profile not found' });
        }
        
        res.json({
            ...user,
            _id: user.id,
            displayName: user.display_name,
            genreTags: user.genre_tags,
            socialLinks: user.social_links
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
