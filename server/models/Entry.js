const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
    shelf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shelf',
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    body: {
        type: String,
        default: ''
    },
    wordCount: {
        type: Number,
        default: 0
    },
    order: {
        type: Number,
        default: 0
    },
    visibility: {
        type: String,
        enum: ['draft', 'published', 'scheduled', 'unlisted'],
        default: 'draft'
    },
    scheduledAt: {
        type: Date,
        default: null
    },
    authorNote: {
        type: String,
        default: ''
    },
    tags: [{
        type: String,
        trim: true
    }],
    contentWarnings: [{
        type: String,
        trim: true
    }],
    contentHash: {
        type: String,
        default: ''
    },
    titleHistory: [{
        oldTitle: String,
        changedAt: {
            type: Date,
            default: Date.now
        }
    }],
    revisionNotes: [{
        note: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    likesCount: {
        type: Number,
        default: 0
    },
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    commentsEnabled: {
        type: Boolean,
        default: true
    },
    repostsEnabled: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Entry', entrySchema);
