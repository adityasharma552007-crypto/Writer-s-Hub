import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PageWrapper from '../../components/Layout/PageWrapper';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../api/api';

export default function CommunityListPage() {
    const { user } = useAuth();
    const [communities, setCommunities] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchCommunities(); }, []);

    const fetchCommunities = async () => {
        try {
            const { data } = await api.get('/communities');
            setCommunities(data.communities);
        } catch { }
        setLoading(false);
    };

    const filtered = communities.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

    if (loading) return <PageWrapper><LoadingSpinner /></PageWrapper>;

    return (
        <PageWrapper>
            <div style={{ maxWidth: 900 }} className="fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                    <h1>🌐 Communities</h1>
                    {user && <Link to="/communities/create" className="btn btn-primary">+ Create Community</Link>}
                </div>

                <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search communities..." style={{ marginBottom: 20 }} />

                {filtered.length === 0 ? (
                    <div className="empty-state glass-card"><h3>No communities found</h3></div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                        {filtered.map(c => (
                            <Link to={`/communities/${c._id}`} key={c._id} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3>{c.name}</h3>
                                    {c.isOfficial && <span className="badge badge-success">Official</span>}
                                </div>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>{c.description?.substring(0, 100)}</p>
                                <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                    <span>👥 {c.members?.length || 0} members</span>
                                    <span className="badge">{c.category || 'general'}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </PageWrapper>
    );
}
