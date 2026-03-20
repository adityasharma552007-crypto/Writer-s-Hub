const { supabase } = require('../supabaseClient');

const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Use Supabase to verify the token
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Just attach the Supabase user ID directly 
        // (the profiles table uses this exact same ID as its primary key)
        req.user = { id: user.id, email: user.email };

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Server Auth error' });
    }
};

// Optional auth — doesn't fail if no token, just sets req.user if present
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabase.auth.getUser(token);

            if (user) {
                req.user = { id: user.id, email: user.email };
            }
        }
    } catch (error) {
        // Ignore — user simply not authenticated
    }
    next();
};

module.exports = { auth, optionalAuth };
