import Sidebar from './Sidebar';
import './PageWrapper.css';

export default function PageWrapper({ children, hideSidebar = false }) {
    return (
        <div className="page-wrapper">
            {!hideSidebar && <Sidebar />}
            <main className={`page-content ${hideSidebar ? 'full-width' : ''}`} id="main-content">
                {children}
            </main>
        </div>
    );
}
