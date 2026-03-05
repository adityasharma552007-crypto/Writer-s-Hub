const mongoose = require('mongoose');

const shelfSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    coverImage: {
        type: String,
        default: ''
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'draft'],
        default: 'public'
    },
    status: {
        type: String,
        enum: ['ongoing', 'complete', 'hiatus'],
        default: 'ongoing'
    },
    genreTags: [{
        type: String,
        trim: true
    }],
    order: {
        type: Number,
        default: 0
    },
    archived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Shelf', shelfSchema);
