const router = require('express').Router();
const { supabase } = require('../supabaseClient');
const { auth } = require('../middleware/auth');

// Create report
router.post('/', auth, async (req, res) => {
    try {
        const { targetType, targetId, reason } = req.body;

        if (!targetType || !targetId || !reason) {
            return res.status(400).json({ error: 'Target type, target ID, and reason are required' });
        }

        const { data: report, error } = await supabase
            .from('reports')
            .insert({
                reporter: req.user.id,
                target_type: targetType,
                target_id: targetId,
                reason
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return res.status(400).json({ error: 'You have already reported this content' });
            }
            throw error;
        }

        res.status(201).json({ ...report, _id: report.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
