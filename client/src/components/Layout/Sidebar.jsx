import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
    const { user } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <aside className="sidebar" role="complementary" aria-label="Sidebar navigation">
            <div className="sidebar-content">
                {user && (
                    <Link to="/entry/new" className="btn btn-primary sidebar-create-btn">
                        ✏️ Create New Entry
                    </Link>
                )}

                <nav className="sidebar-nav" aria-label="Quick links">
                    <div className="sidebar-section-title">Quick Links</div>
                    <Link to="/" className={`sidebar-link ${isActive('/') ? 'active' : ''}`}>
                        <span>🏠</span> Home Feed
                    </Link>
                    <Link to="/trending" className={`sidebar-link ${isActive('/trending') ? 'active' : ''}`}>
                        <span>🔥</span> Trending
                    </Link>
                    <Link to="/search" className={`sidebar-link ${isActive('/search') ? 'active' : ''}`}>
                        <span>🔍</span> Explore
                    </Link>
                    {user && (
                        <>
                            <Link to="/dashboard" className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`}>
                                <span>📊</span> Dashboard
                            </Link>
                            <Link to="/bookmarks" className={`sidebar-link ${isActive('/bookmarks') ? 'active' : ''}`}>
                                <span>🔖</span> Bookmarks
                            </Link>
                        </>
                    )}
                </nav>

                <nav className="sidebar-nav" aria-label="Communities">
                    <div className="sidebar-section-title">Communities</div>
                    <Link to="/communities" className={`sidebar-link ${isActive('/communities') ? 'active' : ''}`}>
                        <span>🌐</span> Browse All
                    </Link>
                    {user && (
                        <Link to="/communities/create" className="sidebar-link">
                            <span>➕</span> Create Community
                        </Link>
                    )}
                </nav>

                {!user && (
                    <div className="sidebar-cta glass-card">
                        <h4>Join Writer's Hub</h4>
                        <p>Share your stories with the world</p>
                        <Link to="/register" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                            Get Started Free
                        </Link>
                    </div>
                )}
            </div>
        </aside>
    );
}
