const router = require('express').Router();
const { supabase } = require('../supabaseClient');
const { auth } = require('../middleware/auth');

// List notifications
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const { data: notifications, error, count: total } = await supabase
            .from('notifications')
            .select('*, sender:profiles!notifications_sender_fkey(id, username, display_name, avatar)', { count: 'exact' })
            .eq('recipient', req.user.id)
            .order('created_at', { ascending: false })
            .range(skip, skip + limit - 1);

        if (error) throw error;

        const { count: unreadCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('recipient', req.user.id)
            .eq('read', false);

        res.json({
            notifications: notifications.map(n => ({
                ...n,
                _id: n.id,
                createdAt: n.created_at,
                updatedAt: n.updated_at,
                sender: n.sender ? {
                    _id: n.sender.id,
                    username: n.sender.username,
                    displayName: n.sender.display_name,
                    avatar: n.sender.avatar
                } : null
            })),
            unreadCount: unreadCount || 0,
            page,
            totalPages: Math.ceil((total || 0) / limit),
            total: total || 0
        });
    } catch (error) {
        console.error('[Notifications] GET / error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get unread count
router.get('/unread-count', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('recipient', userId)
            .eq('read', false);

        if (error) throw error;
        
        res.json({ count: count || 0 });
    } catch (error) {
        console.error('[Notifications] GET /unread-count error:', error);
        res.status(500).json({ error: error.message || 'Error fetching unread count' });
    }
});

// Mark single as read
router.put('/:id/read', auth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .eq('recipient', req.user.id);
            
        if (error) throw error;
        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark all as read
router.put('/read-all', auth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true, updated_at: new Date().toISOString() })
            .eq('recipient', req.user.id)
            .eq('read', false);
            
        if (error) throw error;
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
