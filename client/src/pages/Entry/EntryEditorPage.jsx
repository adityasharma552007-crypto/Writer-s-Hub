import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import PageWrapper from '../../components/Layout/PageWrapper';
import api from '../../api/api';
import './EntryEditor.css';

export default function EntryEditorPage() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const shelfId = searchParams.get('shelf');
    const { user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const isEditing = !!id;

    const [form, setForm] = useState({
        title: '', body: '', authorNote: '', tags: '', contentWarnings: '', visibility: 'draft', shelf: shelfId || ''
    });
    const [shelves, setShelves] = useState([]);
    const [wordCount, setWordCount] = useState(0);
    const [saving, setSaving] = useState(false);
    const [autoSaved, setAutoSaved] = useState(null);
    const autoSaveRef = useRef(null);

    useEffect(() => {
        const userId = user?.id || user?._id;
        if (userId) {
            api.get(`/shelves/user/${userId}`).then(({ data }) => setShelves(data)).catch(() => { });
        }
    }, [user]);

    useEffect(() => {
        if (isEditing) {
            api.get(`/entries/${id}`).then(({ data }) => {
                const e = data.entry;
                setForm({
                    title: e.title, body: e.body || '', authorNote: e.authorNote || '',
                    tags: (e.tags || []).join(', '), contentWarnings: (e.contentWarnings || []).join(', '),
                    visibility: e.visibility, shelf: e.shelf?._id || e.shelf
                });
                updateWordCount(e.body || '');
            }).catch(() => navigate('/dashboard'));
        }
    }, [id]);

    const updateWordCount = (text) => {
        const clean = text.replace(/<[^>]*>/g, '').trim();
        setWordCount(clean ? clean.split(/\s+/).length : 0);
    };

    const handleBodyChange = (e) => {
        const value = e.target.value;
        setForm(prev => ({ ...prev, body: value }));
        updateWordCount(value);
    };

    // Auto-save every 60s
    const autoSave = useCallback(async () => {
        if (!form.title || !form.shelf) return;
        try {
            const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), contentWarnings: form.contentWarnings.split(',').map(t => t.trim()).filter(Boolean) };
            if (isEditing) {
                await api.put(`/entries/${id}`, payload);
            }
            setAutoSaved(new Date().toLocaleTimeString());
        } catch { }
    }, [form, id, isEditing]);

    useEffect(() => {
        if (isEditing) {
            autoSaveRef.current = setInterval(autoSave, 60000);
            return () => clearInterval(autoSaveRef.current);
        }
    }, [autoSave, isEditing]);

    const handleSave = async (publish = false) => {
        if (!form.title.trim()) { toast.error('Title is required'); return; }
        if (!form.shelf) { toast.error('Please select a shelf'); return; }
        setSaving(true);
        try {
            const payload = {
                ...form,
                tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
                contentWarnings: form.contentWarnings.split(',').map(t => t.trim()).filter(Boolean)
            };

            let entryId = id;
            if (isEditing) {
                await api.put(`/entries/${id}`, payload);
            } else {
                const { data } = await api.post('/entries', payload);
                entryId = data._id;
            }

            if (publish) {
                try {
                    await api.post(`/entries/${entryId}/publish`);
                    toast.success('Published! 🎉');
                } catch (err) {
                    if (err.response?.status === 409) {
                        toast.error('Plagiarism detected: ' + (err.response.data.matches?.[0]?.title || 'Similar content found'));
                        setSaving(false);
                        return;
                    }
                    throw err;
                }
            } else {
                toast.success('Draft saved!');
            }
            navigate(`/entry/${entryId}`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    // Simple toolbar actions for textarea
    const textareaRef = useRef(null);
    const insertFormatting = (prefix, suffix = prefix) => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const selected = form.body.substring(start, end);
        const newText = form.body.substring(0, start) + prefix + selected + suffix + form.body.substring(end);
        setForm(prev => ({ ...prev, body: newText }));
        updateWordCount(newText);
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
    };

    return (
        <PageWrapper hideSidebar>
            <div className="entry-editor fade-in">
                <div className="editor-header">
                    <h1>{isEditing ? 'Edit Entry' : 'New Entry'}</h1>
                    <div className="editor-actions">
                        <span className="word-count">{wordCount} words · ~{Math.ceil(wordCount / 200)} min read</span>
                        {autoSaved && <span className="auto-save-indicator">Auto-saved {autoSaved}</span>}
                        <button className="btn btn-secondary" onClick={() => handleSave(false)} disabled={saving}>Save Draft</button>
                        <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving}>
                            {saving ? 'Saving...' : '🚀 Publish'}
                        </button>
                    </div>
                </div>

                <div className="editor-form">
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div className="form-group" style={{ flex: 2 }}>
                            <input className="input editor-title-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Entry Title" />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <select className="input" value={form.shelf} onChange={e => setForm({ ...form, shelf: e.target.value })}>
                                <option value="">Select Shelf</option>
                                {shelves.map(s => <option key={s._id} value={s._id}>{s.title}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Text formatting toolbar */}
                    <div className="editor-toolbar">
                        <button type="button" className="toolbar-btn" onClick={() => insertFormatting('**')} title="Bold"><b>B</b></button>
                        <button type="button" className="toolbar-btn" onClick={() => insertFormatting('*')} title="Italic"><i>I</i></button>
                        <button type="button" className="toolbar-btn" onClick={() => insertFormatting('\n## ', '\n')} title="Heading">H</button>
                        <button type="button" className="toolbar-btn" onClick={() => insertFormatting('\n> ', '\n')} title="Quote">❝</button>
                        <button type="button" className="toolbar-btn" onClick={() => insertFormatting('\n- ', '\n')} title="List">•</button>
                        <button type="button" className="toolbar-btn" onClick={() => insertFormatting('\n---\n', '')} title="Divider">—</button>
                    </div>

                    <textarea
                        ref={textareaRef}
                        className="input editor-textarea"
                        value={form.body}
                        onChange={handleBodyChange}
                        placeholder="Start writing your masterpiece..."
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group"><label>Author's Note</label>
                            <textarea className="input" value={form.authorNote} onChange={e => setForm({ ...form, authorNote: e.target.value })} rows={2} placeholder="A note to your readers..." /></div>
                        <div className="form-group"><label>Tags (comma-separated)</label>
                            <input className="input" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="fiction, drama" /></div>
                        <div className="form-group"><label>Content Warnings (comma-separated)</label>
                            <input className="input" value={form.contentWarnings} onChange={e => setForm({ ...form, contentWarnings: e.target.value })} /></div>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
}
