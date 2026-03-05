import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PageWrapper from '../../components/Layout/PageWrapper';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../api/api';

export default function BookmarksPage() {
    const { user } = useAuth();
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchBookmarks(); }, []);

    const fetchBookmarks = async () => {
        try {
            const { data } = await api.get('/bookmarks');
            setBookmarks(data.bookmarks);
        } catch { }
        setLoading(false);
    };

    const removeBookmark = async (entryId) => {
        try {
            await api.delete(`/bookmarks/${entryId}`);
            setBookmarks(prev => prev.filter(b => b.entry?._id !== entryId));
        } catch { }
    };

    if (loading) return <PageWrapper><LoadingSpinner /></PageWrapper>;

    return (
        <PageWrapper>
            <div style={{ maxWidth: 700 }} className="fade-in">
                <h1 style={{ marginBottom: 24 }}>🔖 Bookmarks</h1>
                {bookmarks.length === 0 ? (
                    <div className="empty-state glass-card"><span className="empty-icon">🔖</span><h3>No bookmarks yet</h3><p>Save entries to read later</p></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {bookmarks.map(b => b.entry && (
                            <div key={b._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Link to={`/entry/${b.entry._id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                                    <h4>{b.entry.title}</h4>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                        by {b.entry.author?.displayName || b.entry.author?.username} · {b.entry.wordCount} words
                                    </div>
                                </Link>
                                <button className="btn btn-ghost btn-sm" onClick={() => removeBookmark(b.entry._id)}>✕</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </PageWrapper>
    );
}
