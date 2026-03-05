import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PageWrapper from '../../components/Layout/PageWrapper';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../api/api';

export default function ShelfPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [shelf, setShelf] = useState(null);
    const [entries, setEntries] = useState([]);
    const [isOwner, setIsOwner] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchShelf(); }, [id]);

    const fetchShelf = async () => {
        try {
            const { data } = await api.get(`/shelves/${id}`);
            setShelf(data.shelf);
            setEntries(data.entries);
            setIsOwner(data.isOwner);
        } catch {
            setShelf(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <PageWrapper><LoadingSpinner /></PageWrapper>;
    if (!shelf) return <PageWrapper><div className="empty-state"><h2>Shelf not found</h2></div></PageWrapper>;

    return (
        <PageWrapper>
            <div style={{ maxWidth: 800 }} className="fade-in">
                <div className="glass-card" style={{ marginBottom: 24 }}>
                    {shelf.coverImage && <img src={shelf.coverImage} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: '10px', marginBottom: 16 }} />}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <h1>{shelf.title}</h1>
                            <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>by <Link to={`/profile/${shelf.owner?.username}`}>{shelf.owner?.displayName || shelf.owner?.username}</Link></p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <span className={`badge ${shelf.status === 'complete' ? 'badge-success' : shelf.status === 'hiatus' ? 'badge-warning' : ''}`}>{shelf.status}</span>
                            {shelf.genreTags?.map(t => <span key={t} className="badge">{t}</span>)}
                        </div>
                    </div>
                    {shelf.description && <p style={{ color: 'var(--color-text-secondary)', marginTop: 12 }}>{shelf.description}</p>}
                    {isOwner && (
                        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                            <Link to={`/entry/new?shelf=${shelf._id}`} className="btn btn-primary btn-sm">✏️ New Entry</Link>
                            <Link to={`/shelf/${shelf._id}/edit`} className="btn btn-secondary btn-sm">Edit Shelf</Link>
                        </div>
                    )}
                </div>

                <h2 style={{ marginBottom: 16 }}>Entries ({entries.length})</h2>
                {entries.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)' }}>No entries yet.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {entries.map((entry, i) => (
                            <Link to={`/entry/${entry._id}`} key={entry._id} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                    <div>
                                        <span style={{ color: 'var(--color-text-muted)', marginRight: 12 }}>#{i + 1}</span>
                                        <strong>{entry.title}</strong>
                                        {entry.visibility !== 'published' && <span className="badge" style={{ marginLeft: 8 }}>{entry.visibility}</span>}
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                        <span>{entry.wordCount} words</span>
                                        <span>❤️ {entry.likesCount || 0}</span>
                                        <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </PageWrapper>
    );
}
