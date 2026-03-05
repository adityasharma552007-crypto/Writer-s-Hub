const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
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
    category: {
        type: String,
        default: 'general'
    },
    rules: [{
        type: String
    }],
    privacy: {
        type: String,
        enum: ['public', 'private', 'hidden'],
        default: 'public'
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    moderators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    pendingMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isOfficial: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Community', communitySchema);
