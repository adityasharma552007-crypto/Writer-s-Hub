import './Navbar.css';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/api';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (user) {
            api.get('/notifications/unread-count')
                .then(({ data }) => setUnreadCount(data.count))
                .catch(() => { });
        }
    }, [user]);

    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (search.trim()) {
            navigate(`/search?q=${encodeURIComponent(search.trim())}`);
            setSearch('');
        }
    };

    const handleLogout = () => {
        logout();
        setShowDropdown(false);
        navigate('/');
    };

    const getInitial = () => {
        return (user?.displayName || user?.username || '?')[0].toUpperCase();
    };

    return (
        <nav className="navbar" role="navigation" aria-label="Main navigation">
            <div className="navbar-inner">
                <div className="navbar-left">
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
                            <span></span><span></span><span></span>
                        </span>
                    </button>
                    <Link to="/" className="navbar-logo">
                        <span className="logo-icon">✦</span>
                        <span className="logo-text gradient-text">Writer's Hub</span>
                    </Link>
                </div>

                <form className="navbar-search" onSubmit={handleSearch} role="search">
                    <span className="search-icon">🔍</span>
                    <input
                        type="search"
                        placeholder="Search writers, entries, communities..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                        aria-label="Search"
                    />
                </form>

                <div className="navbar-right">
                    <Link to="/" className="nav-link">Feed</Link>
                    <Link to="/trending" className="nav-link">Trending</Link>
                    <Link to="/communities" className="nav-link">Communities</Link>

                    {user ? (
                        <>
                            <Link to="/notifications" className="nav-icon-btn" aria-label="Notifications">
                                <span>🔔</span>
                                {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                            </Link>
                            <div className="user-menu" ref={dropdownRef}>
                                <button
                                    className="avatar-btn"
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    aria-expanded={showDropdown}
                                    aria-haspopup="true"
                                >
                                    {user.avatar ? (
                                        <img src={user.avatar} alt="" className="avatar avatar-sm" />
                                    ) : (
                                        <div className="avatar avatar-sm avatar-placeholder">{getInitial()}</div>
                                    )}
                                </button>
                                {showDropdown && (
                                    <div className="dropdown-menu fade-in" role="menu">
                                        <div className="dropdown-header">
                                            <strong>{user.displayName || user.username}</strong>
                                            <span>@{user.username}</span>
                                        </div>
                                        <div className="dropdown-divider" />
                                        <Link to="/dashboard" className="dropdown-item" onClick={() => setShowDropdown(false)} role="menuitem">📊 Dashboard</Link>
                                        <Link to={`/profile/${user.username}`} className="dropdown-item" onClick={() => setShowDropdown(false)} role="menuitem">👤 Profile</Link>
                                        <Link to="/bookmarks" className="dropdown-item" onClick={() => setShowDropdown(false)} role="menuitem">🔖 Bookmarks</Link>
                                        <Link to="/settings" className="dropdown-item" onClick={() => setShowDropdown(false)} role="menuitem">⚙️ Settings</Link>
                                        <div className="dropdown-divider" />
                                        <button className="dropdown-item dropdown-item-danger" onClick={handleLogout} role="menuitem">🚪 Logout</button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="auth-buttons">
                            <Link to="/login" className="btn btn-ghost">Sign In</Link>
                            <Link to="/register" className="btn btn-primary">Get Started</Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="mobile-menu fade-in">
                    <Link to="/" onClick={() => setMobileMenuOpen(false)}>Feed</Link>
                    <Link to="/trending" onClick={() => setMobileMenuOpen(false)}>Trending</Link>
                    <Link to="/communities" onClick={() => setMobileMenuOpen(false)}>Communities</Link>
                    {user && (
                        <>
                            <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                            <Link to={`/profile/${user.username}`} onClick={() => setMobileMenuOpen(false)}>Profile</Link>
                        </>
                    )}
                </div>
            )}
        </nav>
    );
}
