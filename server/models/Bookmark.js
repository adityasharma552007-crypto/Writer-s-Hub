const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    entry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entry',
        required: true
    }
}, {
    timestamps: true
});

// Unique compound index — one bookmark per user per entry
bookmarkSchema.index({ user: 1, entry: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
