import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PageWrapper from '../../components/Layout/PageWrapper';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../api/api';

export default function DiscoveryFeedPage() {
    const { user } = useAuth();
    const [feed, setFeed] = useState({ following: [], trending: [], suggestions: [] });
    const [publicTrending, setPublicTrending] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id || user?._id) {
            api.get('/feed').then(({ data }) => setFeed(data)).catch(() => { }).finally(() => setLoading(false));
        } else if (user === null) {
            api.get('/feed/trending').then(({ data }) => setPublicTrending(data.entries)).catch(() => { }).finally(() => setLoading(false));
        }
    }, [user]);

    if (loading) return <PageWrapper><LoadingSpinner text="Loading feed..." /></PageWrapper>;

    const EntryCard = ({ entry }) => (
        <Link to={`/entry/${entry._id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3 style={{ marginBottom: 8 }}>{entry.title}</h3>
            <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                <Link to={`/profile/${entry.author?.username}`} onClick={e => e.stopPropagation()} style={{ fontWeight: 500 }}>
                    {entry.author?.displayName || entry.author?.username}
                </Link>
                <span>{entry.wordCount} words</span>
                <span>❤️ {entry.likesCount || 0}</span>
                {entry.shelf && <span>📚 {entry.shelf.title}</span>}
            </div>
            {entry.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {entry.tags.slice(0, 4).map(t => <span key={t} className="badge">{t}</span>)}
                </div>
            )}
        </Link>
    );

    return (
        <PageWrapper>
            <div style={{ maxWidth: 800 }} className="fade-in">
                {user ? (
                    <>
                        {feed.following.length > 0 && (
                            <div style={{ marginBottom: 40 }}>
                                <h2 style={{ marginBottom: 16 }}>📖 Following</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {feed.following.map(e => <EntryCard key={e._id} entry={e} />)}
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: 40 }}>
                            <h2 style={{ marginBottom: 16 }}>🔥 Trending</h2>
                            {feed.trending.length === 0 ? (
                                <p style={{ color: 'var(--color-text-muted)' }}>Nothing trending yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {feed.trending.map(e => <EntryCard key={e._id} entry={e} />)}
                                </div>
                            )}
                        </div>

                        {feed.suggestions.length > 0 && (
                            <div>
                                <h2 style={{ marginBottom: 16 }}>💡 Discover</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {feed.suggestions.map(e => <EntryCard key={e._id} entry={e} />)}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="glass-card" style={{ textAlign: 'center', padding: '48px', marginBottom: 32 }}>
                            <h1 style={{ fontSize: '2rem', marginBottom: 8 }}><span className="gradient-text">Writer's Hub</span></h1>
                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                                A home for writers & readers. Share your stories, discover new voices, and build your creative community.
                            </p>
                            <Link to="/register" className="btn btn-primary btn-lg">Get Started Free</Link>
                        </div>
                        <h2 style={{ marginBottom: 16 }}>🔥 Trending Now</h2>
                        {publicTrending.length === 0 ? (
                            <p style={{ color: 'var(--color-text-muted)' }}>No entries yet. Be the first!</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {publicTrending.map(e => <EntryCard key={e._id} entry={e} />)}
                            </div>
                        )}
                    </>
                )}
            </div>
        </PageWrapper>
    );
}
