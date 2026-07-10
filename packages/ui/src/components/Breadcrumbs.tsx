import Link from 'next/link';

type Crumb = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: '1rem', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {crumb.href && !isLast ? (
              <Link href={crumb.href} style={{ color: 'var(--accent4)', textDecoration: 'none', fontWeight: 700 }}>
                {crumb.label}
              </Link>
            ) : (
              <span style={{ color: isLast ? 'var(--text)' : 'var(--text-dim)', fontWeight: isLast ? 700 : 400 }}>
                {crumb.label}
              </span>
            )}
            {!isLast && <span style={{ color: 'var(--border)' }}>›</span>}
          </span>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;