const router = require('express').Router();
const { supabase } = require('../supabaseClient');
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

        const { data: community, error } = await supabase
            .from('communities')
            .insert({
                name,
                description: description || '',
                category: category || '',
                privacy: privacy || 'public',
                rules: rules || [],
                owner: req.user.id,
                members: [req.user.id] // Owner is first member
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return res.status(400).json({ error: 'Community name already taken' });
            }
            throw error;
        }

        res.status(201).json({ ...community, _id: community.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List communities
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const start = (page - 1) * limit;
        const end = start + limit - 1;
        const search = req.query.search;
        const category = req.query.category;

        let query = supabase
            .from('communities')
            .select('*, owner:profiles!communities_owner_fkey(id, username, display_name, avatar)', { count: 'exact' })
            .neq('privacy', 'hidden');

        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }
        if (category) {
            query = query.eq('category', category);
        }

        // We can't sort by array length in PostgREST natively easily without a computed column.
        // For now, we'll order by created_at. Alternatively, could fetch all matching and sort in memory if payload isn't massive.
        const { data: communities, count, error } = await query
            .order('created_at', { ascending: false }) 
            .range(start, end);

        if (error) throw error;

        const mapped = (communities || []).map(c => ({
            ...c,
            _id: c.id,
            coverImage: c.cover_image,
            isOfficial: c.is_official,
            createdAt: c.created_at,
            owner: c.owner ? { ...c.owner, _id: c.owner.id, displayName: c.owner.display_name } : null
        }));

        res.json({
            communities: mapped,
            page,
            totalPages: Math.ceil((count || 0) / limit),
            total: count || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single community
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const { data: community, error } = await supabase
            .from('communities')
            .select('*, owner:profiles!communities_owner_fkey(id, username, display_name, avatar)')
            .eq('id', req.params.id)
            .single();

        if (error || !community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        const isMember = req.user ? (community.members || []).includes(req.user.id) : false;
        const isOwner = req.user ? community.owner.id === req.user.id : false;
        const isModerator = req.user ? (community.moderators || []).includes(req.user.id) : false;

        // Fetch populated users for members & moderators natively wasn't easy since it's an array of UUIDs.
        // In Supabase, usually we use a junction table instead of UUID arrays. Since we used UUID arrays to match Mongo, we'll fetch profiles in a secondary query.
        
        let membersData = [];
        let modsData = [];

        if ((community.members || []).length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar')
                .in('id', community.members);
            membersData = (profiles || []).map(p => ({ ...p, _id: p.id, displayName: p.display_name }));
        }

        if ((community.moderators || []).length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar')
                .in('id', community.moderators);
            modsData = (profiles || []).map(p => ({ ...p, _id: p.id, displayName: p.display_name }));
        }

        res.json({
            community: {
                ...community,
                _id: community.id,
                coverImage: community.cover_image,
                isOfficial: community.is_official,
                createdAt: community.created_at,
                owner: { ...community.owner, _id: community.owner.id, displayName: community.owner.display_name },
                members: membersData,
                moderators: modsData
            },
            isMember,
            isOwner,
            isModerator,
            memberCount: (community.members || []).length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update community
router.put('/:id', auth, async (req, res) => {
    try {
        const { data: community } = await supabase
            .from('communities')
            .select('id, owner')
            .eq('id', req.params.id)
            .single();

        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }
        if (community.owner !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const allowedUpdates = ['name', 'description', 'category', 'privacy', 'rules'];
        const updates = {};
        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        const { data: updated, error } = await supabase
            .from('communities')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json({ ...updated, _id: updated.id, coverImage: updated.cover_image });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload community cover
router.post('/:id/cover', auth, uploadCover, async (req, res) => {
    try {
        const { data: community } = await supabase
            .from('communities')
            .select('id, owner')
            .eq('id', req.params.id)
            .single();

        if (!community || community.owner !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const filePath = `/uploads/${req.file.filename}`;
        
        const { data: updated, error } = await supabase
            .from('communities')
            .update({ cover_image: filePath })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json({ ...updated, _id: updated.id, coverImage: updated.cover_image });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Join community
router.post('/:id/join', auth, async (req, res) => {
    try {
        const { data: community } = await supabase
            .from('communities')
            .select('owner, members, privacy, pending_members')
            .eq('id', req.params.id)
            .single();

        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        const members = community.members || [];
        const pending = community.pending_members || [];

        if (members.includes(req.user.id)) {
            return res.status(400).json({ error: 'Already a member' });
        }

        if (community.privacy === 'private') {
            if (!pending.includes(req.user.id)) {
                await supabase
                    .from('communities')
                    .update({ pending_members: [...pending, req.user.id] })
                    .eq('id', req.params.id);
            }
            return res.json({ message: 'Join request sent', pending: true });
        }

        await supabase
            .from('communities')
            .update({ members: [...members, req.user.id] })
            .eq('id', req.params.id);

        const { data: currentUser } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('id', req.user.id)
            .single();

        await createNotification({
            recipient: community.owner,
            sender: req.user.id,
            type: 'community_join',
            message: `${currentUser?.display_name || currentUser?.username} joined your community`,
            link: `/communities/${req.params.id}`
        });

        res.json({ message: 'Joined community' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Leave community
router.post('/:id/leave', auth, async (req, res) => {
    try {
        const { data: community } = await supabase
            .from('communities')
            .select('owner, members, moderators')
            .eq('id', req.params.id)
            .single();

        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }
        if (community.owner === req.user.id) {
            return res.status(400).json({ error: 'Owner cannot leave the community' });
        }

        const members = (community.members || []).filter(id => id !== req.user.id);
        const mods = (community.moderators || []).filter(id => id !== req.user.id);

        await supabase
            .from('communities')
            .update({ members, moderators: mods })
            .eq('id', req.params.id);

        res.json({ message: 'Left community' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add moderator
router.post('/:id/moderators/:userId', auth, async (req, res) => {
    try {
        const { data: community } = await supabase
            .from('communities')
            .select('owner, members, moderators')
            .eq('id', req.params.id)
            .single();

        if (!community || community.owner !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const members = community.members || [];
        const mods = community.moderators || [];

        if (!members.includes(req.params.userId)) {
            return res.status(400).json({ error: 'User is not a member' });
        }
        if (!mods.includes(req.params.userId)) {
            await supabase
                .from('communities')
                .update({ moderators: [...mods, req.params.userId] })
                .eq('id', req.params.id);
        }
        
        res.json({ message: 'Moderator added' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove member (owner/mod)
router.delete('/:id/members/:userId', auth, async (req, res) => {
    try {
        const { data: community } = await supabase
            .from('communities')
            .select('owner, moderators, members')
            .eq('id', req.params.id)
            .single();

        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        const mods = community.moderators || [];
        const isOwner = community.owner === req.user.id;
        const isMod = mods.includes(req.user.id);
        
        if (!isOwner && !isMod) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        if (community.owner === req.params.userId) {
            return res.status(400).json({ error: 'Cannot remove the owner' });
        }

        const newMembers = (community.members || []).filter(id => id !== req.params.userId);
        const newMods = mods.filter(id => id !== req.params.userId);

        await supabase
            .from('communities')
            .update({ members: newMembers, moderators: newMods })
            .eq('id', req.params.id);

        res.json({ message: 'Member removed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete community
router.delete('/:id', auth, async (req, res) => {
    try {
        const { data: community } = await supabase
            .from('communities')
            .select('owner, is_official')
            .eq('id', req.params.id)
            .single();

        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }
        if (community.is_official) {
            return res.status(403).json({ error: 'Official communities cannot be deleted' });
        }
        if (community.owner !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Deleting the community causes cascade delete for community_posts based on foreign key in schema
        const { error } = await supabase
            .from('communities')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Community deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve pending member (owner/mod for private communities)
router.post('/:id/approve/:userId', auth, async (req, res) => {
    try {
        const { data: community } = await supabase
            .from('communities')
            .select('owner, moderators, members, pending_members')
            .eq('id', req.params.id)
            .single();

        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }
        
        const isOwner = community.owner === req.user.id;
        const isMod = (community.moderators || []).includes(req.user.id);
        if (!isOwner && !isMod) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const pending = (community.pending_members || []).filter(id => id !== req.params.userId);
        const members = community.members || [];
        
        if (!members.includes(req.params.userId)) {
            members.push(req.params.userId);
        }

        await supabase
            .from('communities')
            .update({ pending_members: pending, members })
            .eq('id', req.params.id);

        res.json({ message: 'Member approved' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
