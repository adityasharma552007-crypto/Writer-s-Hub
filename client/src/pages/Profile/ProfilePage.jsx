import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import PageWrapper from '../../components/Layout/PageWrapper';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../api/api';
import './Profile.css';

export default function ProfilePage() {
    const { username } = useParams();
    const { user: currentUser } = useAuth();
    const toast = useToast();
    const [profile, setProfile] = useState(null);
    const [shelves, setShelves] = useState([]);
    const [reposts, setReposts] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, [username]);

    const fetchProfile = async () => {
        try {
            const { data } = await api.get(`/users/${username}`);
            setProfile(data.user);
            setShelves(data.shelves);
            setIsFollowing(data.isFollowing);
            setIsOwner(data.isOwner);

            // Fetch reposts
            const repostRes = await api.get(`/reposts/user/${data.user._id}`);
            setReposts(repostRes.data.reposts || []);
        } catch {
            toast.error('User not found');
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async () => {
        const currentUserId = currentUser?.id || currentUser?._id;
        try {
            if (isFollowing) {
                await api.delete(`/users/${username}/follow`);
                setIsFollowing(false);
                setProfile(p => ({ ...p, followers: p.followers.filter(f => f !== currentUserId) }));
            } else {
                await api.post(`/users/${username}/follow`);
                setIsFollowing(true);
                setProfile(p => ({ ...p, followers: [...p.followers, currentUserId] }));
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Action failed');
        }
    };

    if (loading) return <PageWrapper><LoadingSpinner text="Loading profile..." /></PageWrapper>;
    if (!profile) return <PageWrapper><div className="empty-state"><h2>User not found</h2></div></PageWrapper>;

    const initial = (profile.displayName || profile.username || '?')[0].toUpperCase();

    return (
        <PageWrapper>
            <div className="profile-page fade-in">
                {/* Banner */}
                <div className="profile-banner" style={profile.banner ? { backgroundImage: `url(${profile.banner})` } : {}}>
                    <div className="profile-banner-overlay" />
                </div>

                {/* Header */}
                <div className="profile-header">
                    <div className="profile-avatar-area">
                        {profile.avatar ? (
                            <img src={profile.avatar} alt="" className="avatar avatar-xl" />
                        ) : (
                            <div className="avatar avatar-xl avatar-placeholder" style={{ fontSize: '2rem' }}>{initial}</div>
                        )}
                    </div>
                    <div className="profile-info">
                        <div className="profile-name-row">
                            <h1>{profile.displayName || profile.username}</h1>
                            {isOwner ? (
                                <Link to="/profile/edit" className="btn btn-secondary btn-sm">Edit Profile</Link>
                            ) : currentUser ? (
                                <button className={`btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'}`} onClick={handleFollow}>
                                    {isFollowing ? 'Following' : 'Follow'}
                                </button>
                            ) : null}
                        </div>
                        <p className="profile-username">@{profile.username}</p>
                        {profile.bio && <p className="profile-bio">{profile.bio}</p>}
                        <div className="profile-stats">
                            <span><strong>{profile.followers?.length || 0}</strong> followers</span>
                            <span><strong>{profile.following?.length || 0}</strong> following</span>
                            <span><strong>{shelves.length}</strong> shelves</span>
                        </div>
                        {profile.genreTags?.length > 0 && (
                            <div className="tag-row">{profile.genreTags.map(t => <span key={t} className="badge">{t}</span>)}</div>
                        )}
                    </div>
                </div>

                {/* Shelves */}
                <div className="section">
                    <h2>Shelves</h2>
                    {shelves.length === 0 ? (
                        <p className="text-muted">No shelves yet.</p>
                    ) : (
                        <div className="shelf-grid">
                            {shelves.map(shelf => (
                                <Link to={`/shelf/${shelf._id}`} key={shelf._id} className="shelf-card card">
                                    <h3>{shelf.title}</h3>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        <span className={`badge ${shelf.status === 'complete' ? 'badge-success' : shelf.status === 'hiatus' ? 'badge-warning' : ''}`}>{shelf.status}</span>
                                        {shelf.genreTags?.map(t => <span key={t} className="badge">{t}</span>)}
                                    </div>
                                    {shelf.description && <p className="shelf-desc">{shelf.description}</p>}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Reposts */}
                {reposts.length > 0 && (
                    <div className="section">
                        <h2>Shared by {profile.displayName || profile.username}</h2>
                        <div className="repost-grid">
                            {reposts.map(r => (
                                <Link to={`/entry/${r.originalEntry?._id}`} key={r._id} className="card repost-card">
                                    <div className="repost-label">🔄 Reposted</div>
                                    <h4>{r.originalEntry?.title || 'Untitled'}</h4>
                                    <p className="text-muted">by {r.originalAuthor?.displayName || r.originalAuthor?.username}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </PageWrapper>
    );
}
