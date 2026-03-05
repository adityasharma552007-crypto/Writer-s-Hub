import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import PageWrapper from '../../components/Layout/PageWrapper';
import api from '../../api/api';

export default function EditProfilePage() {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [form, setForm] = useState({ displayName: '', bio: '', genreTags: '', showStats: true, theme: 'default' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setForm({
                displayName: user.displayName || '',
                bio: user.bio || '',
                genreTags: (user.genreTags || []).join(', '),
                showStats: user.showStats !== false,
                theme: user.theme || 'default'
            });
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data } = await api.put('/users/profile', {
                ...form,
                genreTags: form.genreTags.split(',').map(t => t.trim()).filter(Boolean)
            });
            updateUser(data);
            toast.success('Profile updated!');
            navigate(`/profile/${user.username}`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('avatar', file);
        try {
            const { data } = await api.post('/users/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            updateUser(data);
            toast.success('Avatar updated!');
        } catch {
            toast.error('Upload failed');
        }
    };

    const handleBannerUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('cover', file);
        try {
            const { data } = await api.post('/users/banner', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            updateUser(data);
            toast.success('Banner updated!');
        } catch {
            toast.error('Upload failed');
        }
    };

    return (
        <PageWrapper>
            <div style={{ maxWidth: 600 }} className="fade-in">
                <h1 style={{ marginBottom: 24 }}>Edit Profile</h1>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Avatar</label>
                            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="input" />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Banner</label>
                            <input type="file" accept="image/*" onChange={handleBannerUpload} className="input" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Display Name</label>
                        <input className="input" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Bio ({form.bio.length}/300)</label>
                        <textarea className="input" value={form.bio} maxLength={300} rows={3}
                            onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Tell others about yourself..." />
                    </div>
                    <div className="form-group">
                        <label>Genre Tags (comma-separated)</label>
                        <input className="input" value={form.genreTags} onChange={e => setForm({ ...form, genreTags: e.target.value })} placeholder="fiction, poetry, essays" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" id="showStats" checked={form.showStats} onChange={e => setForm({ ...form, showStats: e.target.checked })} />
                        <label htmlFor="showStats">Show stats on profile</label>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</button>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
                    </div>
                </form>
            </div>
        </PageWrapper>
    );
}
