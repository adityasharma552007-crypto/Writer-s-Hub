import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import PageWrapper from '../../components/Layout/PageWrapper';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../api/api';

export default function CommunityPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const toast = useToast();
    const [community, setCommunity] = useState(null);
    const [isMember, setIsMember] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [posts, setPosts] = useState([]);
    const [newPost, setNewPost] = useState('');
    const [tab, setTab] = useState('feed');
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchCommunity(); fetchPosts(); }, [id]);

    const fetchCommunity = async () => {
        try {
            const { data } = await api.get(`/communities/${id}`);
            setCommunity(data.community);
            setIsMember(data.isMember);
            setIsOwner(data.isOwner);
        } catch { } finally { setLoading(false); }
    };

    const fetchPosts = async () => {
        try {
            const { data } = await api.get(`/community-posts/community/${id}`);
            setPosts(data.posts);
        } catch { }
    };

    const handleJoin = async () => {
        try {
            const { data } = await api.post(`/communities/${id}/join`);
            toast.success(data.pending ? 'Join request sent!' : 'Joined!');
            if (!data.pending) setIsMember(true);
            fetchCommunity();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to join');
        }
    };

    const handleLeave = async () => {
        try {
            await api.post(`/communities/${id}/leave`);
            setIsMember(false);
            toast.success('Left community');
            fetchCommunity();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed');
        }
    };

    const handlePost = async (e) => {
        e.preventDefault();
        if (!newPost.trim()) return;
        try {
            const { data } = await api.post('/community-posts', { communityId: id, body: newPost });
            setPosts(prev => [data, ...prev]);
            setNewPost('');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to post');
        }
    };

    if (loading) return <PageWrapper><LoadingSpinner /></PageWrapper>;
    if (!community) return <PageWrapper><div className="empty-state"><h2>Community not found</h2></div></PageWrapper>;

    return (
        <PageWrapper>
            <div style={{ maxWidth: 800 }} className="fade-in">
                <div className="glass-card" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <h1>{community.name} {community.isOfficial && <span className="badge badge-success">Official</span>}</h1>
                            <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>{community.description}</p>
                            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                <span>👥 {community.members?.length || 0} members</span>
                                <span className="badge">{community.category}</span>
                                <span className="badge">{community.privacy}</span>
                            </div>
                        </div>
                        <div>
                            {user && !isOwner && (
                                isMember ? (
                                    <button className="btn btn-secondary btn-sm" onClick={handleLeave}>Leave</button>
                                ) : (
                                    <button className="btn btn-primary btn-sm" onClick={handleJoin}>Join</button>
                                )
                            )}
                            {isOwner && <Link to={`/communities/${id}/edit`} className="btn btn-secondary btn-sm">Edit Community</Link>}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <button className={`btn btn-sm ${tab === 'feed' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('feed')}>Feed</button>
                    <button className={`btn btn-sm ${tab === 'about' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('about')}>About</button>
                </div>

                {tab === 'feed' ? (
                    <>
                        {isMember && (
                            <form onSubmit={handlePost} style={{ marginBottom: 24 }}>
                                <textarea className="input" value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Share something with the community..." rows={3} />
                                <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Post</button>
                            </form>
                        )}
                        {!isMember && user && <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>Join this community to post.</p>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {posts.map(p => (
                                <div key={p._id} className="card">
                                    {p.pinned && <span className="badge badge-warning" style={{ marginBottom: 8 }}>📌 Pinned</span>}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Link to={`/profile/${p.author?.username}`}><strong>{p.author?.displayName || p.author?.username}</strong></Link>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p>{p.body}</p>
                                    {p.sharedEntry && (
                                        <Link to={`/entry/${p.sharedEntry._id}`} className="glass-card" style={{ display: 'block', marginTop: 12, textDecoration: 'none', color: 'inherit' }}>
                                            <h4>{p.sharedEntry.title}</h4>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>by {p.sharedEntry.author?.displayName} · Read Full Entry →</p>
                                        </Link>
                                    )}
                                </div>
                            ))}
                            {posts.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No posts yet.</p>}
                        </div>
                    </>
                ) : (
                    <div className="card">
                        {community.rules?.length > 0 ? (
                            <div><h3 style={{ marginBottom: 12 }}>Rules</h3>
                                <ol style={{ listStyle: 'decimal', paddingLeft: 20 }}>
                                    {community.rules.map((r, i) => <li key={i} style={{ marginBottom: 8, color: 'var(--color-text-secondary)' }}>{r}</li>)}
                                </ol></div>
                        ) : <p style={{ color: 'var(--color-text-muted)' }}>No rules defined.</p>}
                    </div>
                )}
            </div>
        </PageWrapper>
    );
}
