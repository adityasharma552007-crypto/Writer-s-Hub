const crypto = require('crypto');
const stringSimilarity = require('string-similarity');
const { supabase } = require('../supabaseClient');

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
    const { data: hashMatch } = await supabase
        .from('entries')
        .select('id, title, author:profiles!author(username, display_name)')
        .eq('content_hash', hash)
        .neq('author', authorId)
        .eq('visibility', 'published')
        .maybeSingle();

    if (hashMatch) {
        return [{
            similarity: 100,
            entryId: hashMatch.id,
            title: hashMatch.title,
            author: hashMatch.author.display_name || hashMatch.author.username
        }];
    }

    // Fuzzy check against recent published entries
    const { data: recentData } = await supabase
        .from('entries')
        .select('id, title, body, author:profiles!author(username, display_name)')
        .neq('author', authorId)
        .eq('visibility', 'published')
        .neq('body', '')
        .order('created_at', { ascending: false })
        .limit(100);

    const recentEntries = recentData || [];

    const existingTexts = recentEntries.map(e => ({
        text: e.body,
        entryId: e.id,
        title: e.title,
        author: e.author.display_name || e.author.username
    }));

    return checkSimilarity(newText, existingTexts);
};

module.exports = { generateHash, checkSimilarity, checkPlagiarism, normalizeText };
