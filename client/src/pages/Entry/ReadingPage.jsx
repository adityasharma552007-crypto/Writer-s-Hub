import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../api/api';
import './ReadingPage.css';

export default function ReadingPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [entry, setEntry] = useState(null);
    const [prevEntry, setPrevEntry] = useState(null);
    const [nextEntry, setNextEntry] = useState(null);
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [fontSize, setFontSize] = useState('md');
    const [theme, setTheme] = useState('dark');
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchEntry(); }, [id]);

    const fetchEntry = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/entries/${id}`);
            setEntry(data.entry);
            setIsLiked(data.isLiked);
            setLikesCount(data.entry.likesCount);
            setPrevEntry(data.prevEntry);
            setNextEntry(data.nextEntry);
            if (user) {
                api.get(`/bookmarks/check/${id}`).then(({ data: b }) => setIsBookmarked(b.isBookmarked)).catch(() => { });
            }
        } catch {
            setEntry(null);
        } finally { setLoading(false); }
    };

    const handleLike = async () => {
        if (!user) return;
        try {
            const { data } = await api.post(`/entries/${id}/like`);
            setIsLiked(data.isLiked);
            setLikesCount(data.likesCount);
        } catch { }
    };

    const handleBookmark = async () => {
        if (!user) return;
        try {
            if (isBookmarked) { await api.delete(`/bookmarks/${id}`); }
            else { await api.post(`/bookmarks/${id}`); }
            setIsBookmarked(!isBookmarked);
        } catch { }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        // Simple inline toast
    };

    const fontSizes = { sm: '0.9rem', md: '1.05rem', lg: '1.25rem' };
    const themes = {
        dark: { bg: 'var(--color-bg-primary)', text: 'var(--color-text-primary)' },
        light: { bg: '#f5f5f0', text: '#1a1a1a' },
        sepia: { bg: '#f4ecd8', text: '#3b2e18' }
    };

    if (loading) return <div style={{ paddingTop: 100 }}><LoadingSpinner text="Loading..." /></div>;
    if (!entry) return <div style={{ textAlign: 'center', paddingTop: 100 }}><h2>Entry not found</h2></div>;

    const readingTime = Math.ceil((entry.wordCount || 0) / 200);
    const currentTheme = themes[theme];

    return (
        <div className="reading-page" style={{ background: currentTheme.bg, color: currentTheme.text, minHeight: '100vh' }}>
            <div className="reading-header">
                <Link to={`/shelf/${entry.shelf?._id || entry.shelf}`} className="btn btn-ghost btn-sm" style={{ color: currentTheme.text }}>← Back to Shelf</Link>
                <div className="reader-controls">
                    <div className="font-size-controls">
                        {['sm', 'md', 'lg'].map(s => (
                            <button key={s} className={`btn btn-ghost btn-sm ${fontSize === s ? 'active' : ''}`} onClick={() => setFontSize(s)}>{s === 'sm' ? 'A' : s === 'md' ? 'A' : 'A'}</button>
                        ))}
                    </div>
                    <div className="theme-controls">
                        {Object.keys(themes).map(t => (
                            <button key={t} className={`theme-dot ${theme === t ? 'active' : ''}`}
                                style={{ background: themes[t].bg, border: `2px solid ${theme === t ? 'var(--color-primary)' : 'var(--color-border)'}` }}
                                onClick={() => setTheme(t)} aria-label={`${t} theme`} />
                        ))}
                    </div>
                    <span className="reading-time">{readingTime} min read</span>
                </div>
            </div>

            <article className="reading-content" style={{ fontSize: fontSizes[fontSize] }}>
                <h1 className="reading-title">{entry.title}</h1>
                <div className="reading-meta">
                    <Link to={`/profile/${entry.author?.username}`} className="reading-author" style={{ color: 'var(--color-primary)' }}>
                        {entry.author?.displayName || entry.author?.username}
                    </Link>
                    <span>{entry.wordCount} words</span>
                    <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                </div>

                {entry.authorNote && <blockquote className="author-note">{entry.authorNote}</blockquote>}
                {entry.contentWarnings?.length > 0 && (
                    <div className="content-warnings">⚠️ Content Warnings: {entry.contentWarnings.join(', ')}</div>
                )}

                <div className="reading-body" dangerouslySetInnerHTML={{ __html: entry.body }} />
            </article>

            {/* Action bar */}
            <div className="action-bar glass-card">
                <button className={`action-btn ${isLiked ? 'liked' : ''}`} onClick={handleLike} aria-label="Like">
                    {isLiked ? '❤️' : '🤍'} {likesCount}
                </button>
                <button className={`action-btn ${isBookmarked ? 'bookmarked' : ''}`} onClick={handleBookmark} aria-label="Bookmark">
                    {isBookmarked ? '🔖' : '📑'}
                </button>
                <button className="action-btn" onClick={handleShare} aria-label="Share">🔗 Share</button>
            </div>

            {/* Prev/Next */}
            <div className="reading-nav">
                {prevEntry ? <Link to={`/entry/${prevEntry._id}`} className="nav-entry prev">← {prevEntry.title}</Link> : <div />}
                {nextEntry ? <Link to={`/entry/${nextEntry._id}`} className="nav-entry next">{nextEntry.title} →</Link> : <div />}
            </div>

            {/* Comment section inline */}
            <CommentSectionInline entryId={id} commentsEnabled={entry.commentsEnabled} entryAuthorId={entry.author?._id} />
        </div>
    );
}

// Inline comment section to avoid circular issues
function CommentSectionInline({ entryId, commentsEnabled, entryAuthorId }) {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [body, setBody] = useState('');
    const [posting, setPosting] = useState(false);

    useEffect(() => { fetchComments(); }, [entryId]);

    const fetchComments = async () => {
        try {
            const { data } = await api.get(`/comments/entry/${entryId}`);
            setComments(data.comments);
        } catch { }
    };

    const handlePost = async (e) => {
        e.preventDefault();
        if (!body.trim()) return;
        setPosting(true);
        try {
            const { data } = await api.post('/comments', { entryId, body });
            setComments(prev => [data, ...prev]);
            setBody('');
        } catch { }
        setPosting(false);
    };

    const handleDelete = async (commentId) => {
        try {
            await api.delete(`/comments/${commentId}`);
            setComments(prev => prev.filter(c => c._id !== commentId));
        } catch { }
    };

    if (!commentsEnabled) return <div className="comments-section"><p style={{ color: 'var(--color-text-muted)' }}>Comments are disabled for this entry.</p></div>;

    return (
        <div className="comments-section">
            <h3>Comments ({comments.length})</h3>
            {user ? (
                <form onSubmit={handlePost} className="comment-form">
                    <textarea className="input" value={body} onChange={e => setBody(e.target.value)} placeholder="Write a comment..." rows={3} />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={posting}>{posting ? 'Posting...' : 'Post Comment'}</button>
                </form>
            ) : (
                <p style={{ color: 'var(--color-text-muted)' }}><Link to="/login">Sign in</Link> to comment.</p>
            )}
            <div className="comment-list">
                {comments.map(c => (
                    <div key={c._id} className={`comment-item ${c.pinned ? 'pinned' : ''}`}>
                        {c.pinned && <span className="badge badge-warning" style={{ marginBottom: 4 }}>📌 Pinned</span>}
                        <div className="comment-header">
                            <Link to={`/profile/${c.author?.username}`}><strong>{c.author?.displayName || c.author?.username}</strong></Link>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p>{c.body}</p>
                        {(user && (c.author?._id === user._id || entryAuthorId === user._id)) && (
                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c._id)} style={{ fontSize: '0.75rem' }}>Delete</button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
