import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import PageWrapper from '../../components/Layout/PageWrapper';
import api from '../../api/api';

export default function CreateCommunityPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const [form, setForm] = useState({ name: '', description: '', category: 'general', privacy: 'public', rules: '' });
    const [creating, setCreating] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setCreating(true);
        try {
            const { data } = await api.post('/communities', {
                ...form,
                rules: form.rules.split('\n').map(r => r.trim()).filter(Boolean)
            });
            toast.success('Community created!');
            navigate(`/communities/${data._id}`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed');
        } finally { setCreating(false); }
    };

    return (
        <PageWrapper>
            <div style={{ maxWidth: 560 }} className="fade-in">
                <h1 style={{ marginBottom: 24 }}>Create Community</h1>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="form-group"><label>Name *</label>
                        <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                    <div className="form-group"><label>Description</label>
                        <textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div className="form-group" style={{ flex: 1 }}><label>Category</label>
                            <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                <option value="general">General</option><option value="fiction">Fiction</option><option value="poetry">Poetry</option>
                                <option value="non-fiction">Non-Fiction</option><option value="fanfiction">Fanfiction</option><option value="critique">Critique</option>
                            </select></div>
                        <div className="form-group" style={{ flex: 1 }}><label>Privacy</label>
                            <select className="input" value={form.privacy} onChange={e => setForm({ ...form, privacy: e.target.value })}>
                                <option value="public">Public</option><option value="private">Private</option><option value="hidden">Hidden</option>
                            </select></div>
                    </div>
                    <div className="form-group"><label>Rules (one per line)</label>
                        <textarea className="input" value={form.rules} onChange={e => setForm({ ...form, rules: e.target.value })} rows={4} placeholder="Be respectful&#10;No spam&#10;..." /></div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create Community'}</button>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
                    </div>
                </form>
            </div>
        </PageWrapper>
    );
}
