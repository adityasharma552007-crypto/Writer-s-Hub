import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '../../components/Layout/PageWrapper';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../api/api';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchNotifications(); }, []);

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/notifications');
            setNotifications(data.notifications);
        } catch { }
        setLoading(false);
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch { }
    };

    const handleClick = async (notif) => {
        if (!notif.read) {
            try {
                await api.put(`/notifications/${notif._id}/read`);
                setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
            } catch { }
        }
    };

    const icons = { follow: '👤', like: '❤️', comment: '💬', repost: '🔄', publish: '📝', community_join: '🌐', community_post: '📢', mention: '📣' };

    if (loading) return <PageWrapper><LoadingSpinner /></PageWrapper>;

    return (
        <PageWrapper>
            <div style={{ maxWidth: 700 }} className="fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h1>🔔 Notifications</h1>
                    {notifications.some(n => !n.read) && (
                        <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all as read</button>
                    )}
                </div>

                {notifications.length === 0 ? (
                    <div className="empty-state glass-card"><span className="empty-icon">🔔</span><h3>No notifications</h3></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {notifications.map(n => (
                            <Link to={n.link || '#'} key={n._id} className="card"
                                style={{ textDecoration: 'none', color: 'inherit', opacity: n.read ? 0.7 : 1, borderLeft: !n.read ? '3px solid var(--color-primary)' : undefined }}
                                onClick={() => handleClick(n)}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.2rem' }}>{icons[n.type] || '📌'}</span>
                                    <div style={{ flex: 1 }}>
                                        <p>{n.sender?.displayName || n.sender?.username} <span style={{ color: 'var(--color-text-secondary)' }}>{n.message}</span></p>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{new Date(n.createdAt).toLocaleString()}</span>
                                    </div>
                                    {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </PageWrapper>
    );
}
