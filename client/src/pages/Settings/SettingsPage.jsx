import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import PageWrapper from '../../components/Layout/PageWrapper';
import Modal from '../../components/UI/Modal';
import api from '../../api/api';

export default function SettingsPage() {
    const { user, logout, updateUser } = useAuth();
    const toast = useToast();
    const [tab, setTab] = useState('account');
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [showDeactivate, setShowDeactivate] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) { toast.error('Passwords do not match'); return; }
        if (passwords.new.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        try {
            await api.put('/users/password', { currentPassword: passwords.current, newPassword: passwords.new });
            toast.success('Password updated');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed');
        }
    };

    const handlePrivacyUpdate = async (key, value) => {
        try {
            const settings = { ...user.privacySettings, [key]: value };
            await api.put('/users/profile', { privacySettings: settings });
            updateUser({ privacySettings: settings });
            toast.success('Settings saved');
        } catch {
            toast.error('Failed to save');
        }
    };

    const handleNotifUpdate = async (key, value) => {
        try {
            const settings = { ...user.notificationSettings, [key]: value };
            await api.put('/users/profile', { notificationSettings: settings });
            updateUser({ notificationSettings: settings });
            toast.success('Settings saved');
        } catch {
            toast.error('Failed to save');
        }
    };

    const handleDeactivate = async () => {
        try {
            await api.put('/users/deactivate');
            toast.success('Account deactivated');
            logout();
        } catch {
            toast.error('Failed');
        }
    };

    const tabs = [
        { key: 'account', label: '👤 Account' },
        { key: 'privacy', label: '🔒 Privacy' },
        { key: 'notifications', label: '🔔 Notifications' }
    ];

    return (
        <PageWrapper>
            <div style={{ maxWidth: 600 }} className="fade-in">
                <h1 style={{ marginBottom: 24 }}>⚙️ Settings</h1>

                <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                    {tabs.map(t => (
                        <button key={t.key} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t.key)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === 'account' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div className="card">
                            <h3 style={{ marginBottom: 16 }}>Change Password</h3>
                            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div className="form-group"><label>Current Password</label>
                                    <input type="password" className="input" value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} required /></div>
                                <div className="form-group"><label>New Password</label>
                                    <input type="password" className="input" value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })} required /></div>
                                <div className="form-group"><label>Confirm New Password</label>
                                    <input type="password" className="input" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} required /></div>
                                <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>Update Password</button>
                            </form>
                        </div>

                        <div className="card">
                            <h3 style={{ marginBottom: 8 }}>Danger Zone</h3>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>Deactivating your account hides your profile and content.</p>
                            <button className="btn btn-danger btn-sm" onClick={() => setShowDeactivate(true)}>Deactivate Account</button>
                        </div>
                    </div>
                )}

                {tab === 'privacy' && (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[
                            { key: 'allowFollows', label: 'Allow people to follow you' },
                            { key: 'allowComments', label: 'Allow comments on your entries' },
                            { key: 'searchable', label: 'Appear in search results' }
                        ].map(setting => (
                            <label key={setting.key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                                <input type="checkbox" checked={user?.privacySettings?.[setting.key] !== false}
                                    onChange={e => handlePrivacyUpdate(setting.key, e.target.checked)} />
                                <span>{setting.label}</span>
                            </label>
                        ))}
                    </div>
                )}

                {tab === 'notifications' && (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[
                            { key: 'likes', label: 'Likes on your entries' },
                            { key: 'comments', label: 'Comments on your entries' },
                            { key: 'follows', label: 'New followers' },
                            { key: 'reposts', label: 'Reposts of your entries' },
                            { key: 'community', label: 'Community activity' }
                        ].map(setting => (
                            <label key={setting.key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                                <input type="checkbox" checked={user?.notificationSettings?.[setting.key] !== false}
                                    onChange={e => handleNotifUpdate(setting.key, e.target.checked)} />
                                <span>{setting.label}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            <Modal isOpen={showDeactivate} onClose={() => setShowDeactivate(false)} title="Deactivate Account" size="sm">
                <p style={{ marginBottom: 16, color: 'var(--color-text-secondary)' }}>Are you sure? Your profile and content will be hidden.</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={() => setShowDeactivate(false)}>Cancel</button>
                    <button className="btn btn-danger" onClick={handleDeactivate}>Deactivate</button>
                </div>
            </Modal>
        </PageWrapper>
    );
}
