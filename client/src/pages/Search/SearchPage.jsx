import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import PageWrapper from '../../components/Layout/PageWrapper';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../api/api';

export default function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [type, setType] = useState('');
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(false);

    const search = useCallback(async (q) => {
        if (!q.trim()) return;
        setLoading(true);
        try {
            const params = { q };
            if (type) params.type = type;
            const { data } = await api.get('/search', { params });
            setResults(data);
        } catch { }
        setLoading(false);
    }, [type]);

    useEffect(() => {
        const q = searchParams.get('q');
        if (q) { setQuery(q); search(q); }
    }, [searchParams, type]);

    useEffect(() => {
        const timer = setTimeout(() => { if (query.trim()) search(query); }, 300);
        return () => clearTimeout(timer);
    }, [query, search]);

    const tabs = [
        { key: '', label: 'All' },
        { key: 'creators', label: 'Writers' },
        { key: 'entries', label: 'Entries' },
        { key: 'shelves', label: 'Shelves' },
        { key: 'communities', label: 'Communities' }
    ];

    return (
        <PageWrapper>
            <div style={{ maxWidth: 800 }} className="fade-in">
                <h1 style={{ marginBottom: 20 }}>🔍 Search</h1>
                <input className="input" value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Search writers, entries, shelves, communities..." style={{ marginBottom: 16, fontSize: '1rem' }} autoFocus />

                <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                    {tabs.map(t => (
                        <button key={t.key} className={`btn btn-sm ${type === t.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setType(t.key)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {loading && <LoadingSpinner />}

                {!loading && query.trim() && (
                    <>
                        {results.creators?.length > 0 && (
                            <div style={{ marginBottom: 32 }}>
                                <h3 style={{ marginBottom: 12 }}>Writers</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {results.creators.map(u => (
                                        <Link to={`/profile/${u.username}`} key={u._id} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <div className="avatar avatar-placeholder" style={{ fontSize: '0.9rem' }}>{(u.displayName || u.username)[0].toUpperCase()}</div>
                                            <div>
                                                <strong>{u.displayName || u.username}</strong>
                                                <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>@{u.username}</span>
                                                {u.bio && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{u.bio.substring(0, 100)}</p>}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {results.entries?.length > 0 && (
                            <div style={{ marginBottom: 32 }}>
                                <h3 style={{ marginBottom: 12 }}>Entries</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {results.entries.map(e => (
                                        <Link to={`/entry/${e._id}`} key={e._id} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <h4>{e.title}</h4>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                                by {e.author?.displayName || e.author?.username} · {e.wordCount} words · ❤️ {e.likesCount}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {results.shelves?.length > 0 && (
                            <div style={{ marginBottom: 32 }}>
                                <h3 style={{ marginBottom: 12 }}>Shelves</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                                    {results.shelves.map(s => (
                                        <Link to={`/shelf/${s._id}`} key={s._id} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <h4>{s.title}</h4>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>by {s.owner?.displayName || s.owner?.username}</p>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {results.communities?.length > 0 && (
                            <div>
                                <h3 style={{ marginBottom: 12 }}>Communities</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                                    {results.communities.map(c => (
                                        <Link to={`/communities/${c._id}`} key={c._id} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <h4>{c.name}</h4>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{c.members?.length || 0} members</p>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!results.creators?.length && !results.entries?.length && !results.shelves?.length && !results.communities?.length && (
                            <div className="empty-state glass-card"><h3>No results found</h3><p>Try different keywords</p></div>
                        )}
                    </>
                )}
            </div>
        </PageWrapper>
    );
}
