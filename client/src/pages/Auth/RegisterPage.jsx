import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import './Auth.css';

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [form, setForm] = useState({ username: '', displayName: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.username || !form.email || !form.password) {
            setError('Please fill in all required fields');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await register({
                username: form.username,
                displayName: form.displayName || form.username,
                email: form.email,
                password: form.password
            });
            toast.success('Account created! Welcome to Writer\'s Hub');
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card glass-card fade-in">
                <div className="auth-header">
                    <span className="auth-icon">✦</span>
                    <h1 className="gradient-text">Join Writer's Hub</h1>
                    <p>Start sharing your stories with the world</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && <div className="auth-error">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="username">Username *</label>
                        <input id="username" type="text" className="input" placeholder="Choose a username"
                            value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                    </div>

                    <div className="form-group">
                        <label htmlFor="displayName">Display Name</label>
                        <input id="displayName" type="text" className="input" placeholder="How you want to be known"
                            value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} />
                    </div>

                    <div className="form-group">
                        <label htmlFor="reg-email">Email *</label>
                        <input id="reg-email" type="email" className="input" placeholder="you@example.com"
                            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>

                    <div className="form-group">
                        <label htmlFor="reg-password">Password *</label>
                        <input id="reg-password" type="password" className="input" placeholder="At least 6 characters"
                            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password *</label>
                        <input id="confirmPassword" type="password" className="input" placeholder="Re-enter your password"
                            value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
