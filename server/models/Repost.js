const mongoose = require('mongoose');

const repostSchema = new mongoose.Schema({
    reposter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    originalEntry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entry',
        required: true
    },
    originalAuthor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Prevent duplicate reposts
repostSchema.index({ reposter: 1, originalEntry: 1 }, { unique: true });

module.exports = mongoose.model('Repost', repostSchema);
