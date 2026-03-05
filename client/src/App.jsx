import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Navbar from './components/Layout/Navbar';
import LoadingSpinner from './components/UI/LoadingSpinner';

// Pages
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import ProfilePage from './pages/Profile/ProfilePage';
import EditProfilePage from './pages/Profile/EditProfilePage';
import ShelfPage from './pages/Shelf/ShelfPage';
import EditShelfPage from './pages/Shelf/EditShelfPage';
import EntryEditorPage from './pages/Entry/EntryEditorPage';
import ReadingPage from './pages/Entry/ReadingPage';
import DiscoveryFeedPage from './pages/Feed/DiscoveryFeedPage';
import SearchPage from './pages/Search/SearchPage';
import TrendingPage from './pages/Trending/TrendingPage';
import CommunityListPage from './pages/Community/CommunityListPage';
import CommunityPage from './pages/Community/CommunityPage';
import CreateCommunityPage from './pages/Community/CreateCommunityPage';
import NotificationsPage from './pages/Notifications/NotificationsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import BookmarksPage from './pages/Bookmarks/BookmarksPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner text="Loading..." />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <a href="#main-content" className="skip-to-content">Skip to content</a>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/" element={<DiscoveryFeedPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/trending" element={<TrendingPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/shelf/:id" element={<ShelfPage />} />
        <Route path="/entry/:id" element={<ReadingPage />} />
        <Route path="/communities" element={<CommunityListPage />} />
        <Route path="/communities/:id" element={<CommunityPage />} />

        {/* Protected */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/profile/edit" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
        <Route path="/shelf/:id/edit" element={<ProtectedRoute><EditShelfPage /></ProtectedRoute>} />
        <Route path="/entry/new" element={<ProtectedRoute><EntryEditorPage /></ProtectedRoute>} />
        <Route path="/entry/:id/edit" element={<ProtectedRoute><EntryEditorPage /></ProtectedRoute>} />
        <Route path="/communities/create" element={<ProtectedRoute><CreateCommunityPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/bookmarks" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
            <div><h1 style={{ fontSize: '4rem', marginBottom: 8 }}>404</h1><p style={{ color: 'var(--color-text-muted)' }}>Page not found</p></div>
          </div>
        } />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
