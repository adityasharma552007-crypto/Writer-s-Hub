const router = require('express').Router();
const { supabase } = require('../supabaseClient');

// Search across types
router.get('/', async (req, res) => {
    try {
        const { q, type } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const start = (page - 1) * limit;
        const end = start + limit - 1;

        if (!q || !q.trim()) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchQuery = q.trim();
        const results = {};

        // Search creators
        if (!type || type === 'creators') {
            const { data: creators, error } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar, bio, genre_tags, followers')
                .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`)
                .eq('deactivated', false)
                .range(start, end);

            if (!error && creators) {
                results.creators = creators.map(c => ({
                    ...c,
                    _id: c.id,
                    displayName: c.display_name,
                    genreTags: c.genre_tags
                }));
            }
        }

        // Search entries
        if (!type || type === 'entries') {
            const { data: entries, error } = await supabase
                .from('entries')
                .select(`
                    id, title, word_count, tags, created_at, likes_count,
                    author:profiles!entries_author_fkey(id, username, display_name, avatar),
                    shelf:shelves!entries_shelf_fkey(id, title)
                `)
                .or(`title.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`) // Assuming tags is text[] and cs means contains. If tags is string, ilike is fine. Assuming array as standard.
                .eq('visibility', 'published')
                .range(start, end);

            // Note on tags: if tags is stored as a JSONB or standard array, cs works. If it's a comma separated string, ilike.%${searchQuery}% works.
            // Let's use ilike on title for sure. Since tags is a JSON/Array in Supabase we can use standard exact string match or try generic approach.
            // A safer approach: fetch with ilike on title, or fetch all tags that match. Supabase has cs ({value}) for arrays.
            
            // To be completely safe without knowing if tags is TEXT[] or JSONB, let's use a standard or query if text. 
            // In our schema, tags is TEXT[]. So `tags.cs.{${searchQuery}}` finds rows where tags array contains the query exactly.
            
            if (!error && entries) {
                results.entries = entries.map(e => ({
                    ...e,
                    _id: e.id,
                    wordCount: e.word_count,
                    createdAt: e.created_at,
                    likesCount: e.likes_count,
                    author: e.author ? { ...e.author, _id: e.author.id, displayName: e.author.display_name } : null,
                    shelf: e.shelf ? { ...e.shelf, _id: e.shelf.id } : null
                }));
            }
        }

        // Search shelves
        if (!type || type === 'shelves') {
            const { data: shelves, error } = await supabase
                .from('shelves')
                .select(`
                    id, title, description, genre_tags, created_at,
                    owner:profiles!shelves_owner_fkey(id, username, display_name, avatar)
                `)
                .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
                .eq('visibility', 'public')
                .eq('archived', false)
                .range(start, end);

            if (!error && shelves) {
                results.shelves = shelves.map(s => ({
                    ...s,
                    _id: s.id,
                    genreTags: s.genre_tags,
                    createdAt: s.created_at,
                    owner: s.owner ? { ...s.owner, _id: s.owner.id, displayName: s.owner.display_name } : null
                }));
            }
        }

        // Search communities
        if (!type || type === 'communities') {
            const { data: communities, error } = await supabase
                .from('communities')
                .select('id, name, description, cover_image, category, members, privacy, is_official')
                .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
                .neq('privacy', 'hidden')
                .range(start, end);

            if (!error && communities) {
                results.communities = communities.map(c => ({
                    ...c,
                    _id: c.id,
                    coverImage: c.cover_image,
                    isOfficial: c.is_official
                }));
            }
        }

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
