import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import PageWrapper from '../../components/Layout/PageWrapper';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';
import api from '../../api/api';
import './Dashboard.css';

export default function DashboardPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [shelves, setShelves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newShelf, setNewShelf] = useState({ title: '', description: '', visibility: 'public', status: 'ongoing', genreTags: '' });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (user) fetchShelves();
    }, [user]);

    const fetchShelves = async () => {
        try {
            const { data } = await api.get(`/shelves/user/${user._id}`);
            setShelves(data);
        } catch (err) {
            toast.error('Failed to load shelves');
        } finally {
            setLoading(false);
        }
    };

    const createShelf = async (e) => {
        e.preventDefault();
        if (!newShelf.title.trim()) return;
        setCreating(true);
        try {
            const { data } = await api.post('/shelves', {
                ...newShelf,
                genreTags: newShelf.genreTags.split(',').map(t => t.trim()).filter(Boolean)
            });
            setShelves(prev => [...prev, data]);
            toast.success('Shelf created!');
            setShowCreateModal(false);
            setNewShelf({ title: '', description: '', visibility: 'public', status: 'ongoing', genreTags: '' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create shelf');
        } finally {
            setCreating(false);
        }
    };

    const stats = {
        totalShelves: shelves.length,
        publicShelves: shelves.filter(s => s.visibility === 'public').length,
        followers: user?.followers?.length || 0,
        following: user?.following?.length || 0
    };

    if (loading) return <PageWrapper><LoadingSpinner text="Loading dashboard..." /></PageWrapper>;

    return (
        <PageWrapper>
            <div className="dashboard fade-in">
                <div className="dashboard-header">
                    <div>
                        <h1>Welcome back, <span className="gradient-text">{user?.displayName || user?.username}</span> ✨</h1>
                        <p className="dashboard-subtitle">Here's what's happening with your writing</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        📚 New Shelf
                    </button>
                </div>

                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card glass-card"><div className="stat-number">{stats.totalShelves}</div><div className="stat-label">Shelves</div></div>
                    <div className="stat-card glass-card"><div className="stat-number">{stats.publicShelves}</div><div className="stat-label">Published</div></div>
                    <div className="stat-card glass-card"><div className="stat-number">{stats.followers}</div><div className="stat-label">Followers</div></div>
                    <div className="stat-card glass-card"><div className="stat-number">{stats.following}</div><div className="stat-label">Following</div></div>
                </div>

                {/* Shelves */}
                <div className="section">
                    <h2>Your Shelves</h2>
                    {shelves.length === 0 ? (
                        <div className="empty-state glass-card">
                            <span className="empty-icon">📚</span>
                            <h3>No shelves yet</h3>
                            <p>Create your first shelf to start organizing your writing</p>
                            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>Create Shelf</button>
                        </div>
                    ) : (
                        <div className="shelf-grid">
                            {shelves.map(shelf => (
                                <Link to={`/shelf/${shelf._id}`} key={shelf._id} className="shelf-card card">
                                    {shelf.coverImage && <img src={shelf.coverImage} alt="" className="shelf-cover" />}
                                    <div className="shelf-card-body">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <h3>{shelf.title}</h3>
                                            <span className={`badge ${shelf.visibility === 'public' ? 'badge-success' : ''}`}>{shelf.visibility}</span>
                                            <span className="badge">{shelf.status}</span>
                                        </div>
                                        {shelf.description && <p className="shelf-desc">{shelf.description}</p>}
                                        {shelf.genreTags?.length > 0 && (
                                            <div className="tag-row">{shelf.genreTags.map(t => <span key={t} className="badge">{t}</span>)}</div>
                                        )}
                                        <div className="shelf-meta">
                                            <Link to={`/entry/new?shelf=${shelf._id}`} className="btn btn-sm btn-primary" onClick={e => e.stopPropagation()}>
                                                ✏️ New Entry
                                            </Link>
                                            <Link to={`/shelf/${shelf._id}/edit`} className="btn btn-sm btn-ghost" onClick={e => e.stopPropagation()}>Edit</Link>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Shelf Modal */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Shelf">
                <form onSubmit={createShelf} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                        <label>Title *</label>
                        <input className="input" value={newShelf.title} onChange={e => setNewShelf({ ...newShelf, title: e.target.value })} placeholder="My Awesome Shelf" required />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea className="input" value={newShelf.description} onChange={e => setNewShelf({ ...newShelf, description: e.target.value })} placeholder="What is this shelf about?" rows={3} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Visibility</label>
                            <select className="input" value={newShelf.visibility} onChange={e => setNewShelf({ ...newShelf, visibility: e.target.value })}>
                                <option value="public">Public</option>
                                <option value="private">Private</option>
                                <option value="draft">Draft</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Status</label>
                            <select className="input" value={newShelf.status} onChange={e => setNewShelf({ ...newShelf, status: e.target.value })}>
                                <option value="ongoing">Ongoing</option>
                                <option value="complete">Complete</option>
                                <option value="hiatus">Hiatus</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Genre Tags (comma-separated)</label>
                        <input className="input" value={newShelf.genreTags} onChange={e => setNewShelf({ ...newShelf, genreTags: e.target.value })} placeholder="fantasy, sci-fi, romance" />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create Shelf'}</button>
                </form>
            </Modal>
        </PageWrapper>
    );
}
