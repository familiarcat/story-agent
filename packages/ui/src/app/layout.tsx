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
        <nav style={{ padding: '1rem 2rem', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Story Agent</span>
          <a href="/dashboard" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.95rem' }}>Dashboard</a>
          <a href="/agent" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 600 }}>🛠️ Agent Workspace</a>
          <a href="/chat" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.95rem' }}>💬 Chat</a>
          <a href="/sprint" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.95rem' }}>Sprint Board</a>
          <a href="/crew/memories" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.95rem' }}>👥 Crew Memories</a>
          <a href="/story/new" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.95rem' }}>+ New Story</a>
          <a href="/observation-lounge" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.95rem' }}>Observation Lounge</a>
          <a href="/docs" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.95rem' }}>📜 API Docs</a>
          <a href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none', marginLeft: 'auto', fontSize: '0.85rem' }}>
            v1.0.0
          </a>
        </nav>
        <main style={{ padding: '2rem' }}>{children}</main>
      </body>
    </html>
  );
}
