const router = require('express').Router();
const Report = require('../models/Report');
const { auth } = require('../middleware/auth');

// Create report
router.post('/', auth, async (req, res) => {
    try {
        const { targetType, targetId, reason } = req.body;

        if (!targetType || !targetId || !reason) {
            return res.status(400).json({ error: 'Target type, target ID, and reason are required' });
        }

        const report = await Report.create({
            reporter: req.user.id,
            targetType,
            targetId,
            reason
        });

        res.status(201).json(report);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'You have already reported this content' });
        }
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
