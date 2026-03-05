import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '../../components/Layout/PageWrapper';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../api/api';

export default function TrendingPage() {
    const [entries, setEntries] = useState([]);
    const [period, setPeriod] = useState('week');
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchTrending(); }, [period]);

    const fetchTrending = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/feed/trending', { params: { period } });
            setEntries(data.entries);
        } catch { }
        setLoading(false);
    };

    return (
        <PageWrapper>
            <div style={{ maxWidth: 800 }} className="fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                    <h1>🔥 Trending</h1>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className={`btn btn-sm ${period === 'week' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPeriod('week')}>This Week</button>
                        <button className={`btn btn-sm ${period === 'month' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPeriod('month')}>This Month</button>
                    </div>
                </div>

                {loading ? <LoadingSpinner /> : entries.length === 0 ? (
                    <div className="empty-state glass-card"><span className="empty-icon">📝</span><h3>Nothing trending yet</h3><p>Be the first to publish!</p></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {entries.map((e, i) => (
                            <Link to={`/entry/${e._id}`} key={e._id} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', gap: 16, alignItems: 'center' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', minWidth: 32 }}>#{i + 1}</span>
                                <div style={{ flex: 1 }}>
                                    <h3>{e.title}</h3>
                                    <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 4, flexWrap: 'wrap' }}>
                                        <span>{e.author?.displayName || e.author?.username}</span>
                                        <span>{e.wordCount} words</span>
                                        <span>❤️ {e.likesCount}</span>
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
