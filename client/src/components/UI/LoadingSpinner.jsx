export default function LoadingSpinner({ size = 'md', text }) {
    const sizes = { sm: 20, md: 36, lg: 56 };
    const s = sizes[size] || sizes.md;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '40px 0' }}>
            <div style={{
                width: s, height: s,
                border: `3px solid var(--color-border)`,
                borderTop: `3px solid var(--color-primary)`,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
            }} />
            {text && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{text}</span>}
        </div>
    );
}
