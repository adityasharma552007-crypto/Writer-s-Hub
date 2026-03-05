const crypto = require('crypto');
const stringSimilarity = require('string-similarity');
const Entry = require('../models/Entry');

// Normalize text: lowercase, collapse whitespace, remove punctuation
const normalizeText = (text) => {
    return text
        .replace(/<[^>]*>/g, '') // Strip HTML tags
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

// Generate SHA-256 hash of normalized text
const generateHash = (text) => {
    const normalized = normalizeText(text);
    return crypto.createHash('sha256').update(normalized).digest('hex');
};

// Check similarity between new text and existing texts
const checkSimilarity = (newText, existingTexts, threshold = 0.85) => {
    const normalizedNew = normalizeText(newText);
    const matches = [];

    for (const item of existingTexts) {
        const normalizedExisting = normalizeText(item.text);
        const similarity = stringSimilarity.compareTwoStrings(normalizedNew, normalizedExisting);
        if (similarity > threshold) {
            matches.push({
                similarity: Math.round(similarity * 100),
                entryId: item.entryId,
                title: item.title,
                author: item.author
            });
        }
    }

    return matches;
};

// Check plagiarism against published entries (exclude author's own)
const checkPlagiarism = async (newText, authorId) => {
    // First check hash collision
    const hash = generateHash(newText);
    const hashMatch = await Entry.findOne({
        contentHash: hash,
        author: { $ne: authorId },
        visibility: 'published'
    }).populate('author', 'username displayName');

    if (hashMatch) {
        return [{
            similarity: 100,
            entryId: hashMatch._id,
            title: hashMatch.title,
            author: hashMatch.author.displayName || hashMatch.author.username
        }];
    }

    // Fuzzy check against recent published entries
    const recentEntries = await Entry.find({
        author: { $ne: authorId },
        visibility: 'published',
        body: { $exists: true, $ne: '' }
    })
        .sort({ createdAt: -1 })
        .limit(100)
        .select('title body author')
        .populate('author', 'username displayName');

    const existingTexts = recentEntries.map(e => ({
        text: e.body,
        entryId: e._id,
        title: e.title,
        author: e.author.displayName || e.author.username
    }));

    return checkSimilarity(newText, existingTexts);
};

module.exports = { generateHash, checkSimilarity, checkPlagiarism, normalizeText };
