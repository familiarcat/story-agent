import type { ReactNode } from 'react';

type ViewTone = 'observe' | 'learn' | 'neutral';

export function ViewPresentationProvider({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: ViewTone;
  className?: string;
}) {
  const cls = ['view-presentation', `view-tone-${tone}`, className].filter(Boolean).join(' ');
  return <div className={cls}>{children}</div>;
}

export function ViewHeader({
  title,
  subtitle,
  badge,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <header className="view-header">
      <div>
        <h1 className="view-title">{title}</h1>
        {subtitle ? <p className="view-subtitle">{subtitle}</p> : null}
      </div>
      {badge ? <div className="view-badge">{badge}</div> : null}
    </header>
  );
}
