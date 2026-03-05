import { useState } from 'react';
import api from '../../api/api';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../UI/Modal';

export default function ReportModal({ isOpen, onClose, targetType, targetId }) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) return;
        setSubmitting(true);
        try {
            await api.post('/reports', { targetType, targetId, reason });
            toast.success('Report submitted. Thank you.');
            onClose();
            setReason('');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit report');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Report Content" size="sm">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                    <label>Reason</label>
                    <textarea
                        className="input"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Please describe why you are reporting this content..."
                        rows={4}
                        required
                    />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-danger" disabled={submitting || !reason.trim()}>
                        {submitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
