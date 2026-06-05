import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Story Agent',
  description: 'Agentic story delivery dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav style={{ padding: '1rem 2rem', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Story Agent</span>
          <a href="/dashboard" style={{ color: '#2563eb', textDecoration: 'none' }}>Dashboard</a>
          <a href="/sprint" style={{ color: '#2563eb', textDecoration: 'none' }}>Sprint Board</a>
          <a href="/story/new" style={{ color: '#2563eb', textDecoration: 'none' }}>+ New Story</a>
          <a href="/observation-lounge" style={{ color: '#2563eb', textDecoration: 'none' }}>Observation Lounge</a>
          <a href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none', marginLeft: 'auto', fontSize: '0.85rem' }}>
            v1.0.0
          </a>
        </nav>
        <main style={{ padding: '2rem' }}>{children}</main>
      </body>
    </html>
  );
}
