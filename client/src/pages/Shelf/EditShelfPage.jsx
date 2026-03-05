import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import PageWrapper from '../../components/Layout/PageWrapper';
import api from '../../api/api';

export default function EditShelfPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [form, setForm] = useState({ title: '', description: '', visibility: 'public', status: 'ongoing', genreTags: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get(`/shelves/${id}`).then(({ data }) => {
            const s = data.shelf;
            setForm({ title: s.title, description: s.description || '', visibility: s.visibility, status: s.status, genreTags: (s.genreTags || []).join(', ') });
        }).catch(() => navigate('/dashboard'));
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/shelves/${id}`, { ...form, genreTags: form.genreTags.split(',').map(t => t.trim()).filter(Boolean) });
            toast.success('Shelf updated!');
            navigate(`/shelf/${id}`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update');
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this shelf and all its entries? This cannot be undone.')) return;
        try {
            await api.delete(`/shelves/${id}`);
            toast.success('Shelf deleted');
            navigate('/dashboard');
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    return (
        <PageWrapper>
            <div style={{ maxWidth: 600 }} className="fade-in">
                <h1 style={{ marginBottom: 24 }}>Edit Shelf</h1>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-group"><label>Title *</label>
                        <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
                    <div className="form-group"><label>Description</label>
                        <textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div className="form-group" style={{ flex: 1 }}><label>Visibility</label>
                            <select className="input" value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })}>
                                <option value="public">Public</option><option value="private">Private</option><option value="draft">Draft</option></select></div>
                        <div className="form-group" style={{ flex: 1 }}><label>Status</label>
                            <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                <option value="ongoing">Ongoing</option><option value="complete">Complete</option><option value="hiatus">Hiatus</option></select></div>
                    </div>
                    <div className="form-group"><label>Genre Tags (comma-separated)</label>
                        <input className="input" value={form.genreTags} onChange={e => setForm({ ...form, genreTags: e.target.value })} /></div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
                        <button type="button" className="btn btn-danger" onClick={handleDelete} style={{ marginLeft: 'auto' }}>Delete Shelf</button>
                    </div>
                </form>
            </div>
        </PageWrapper>
    );
}
