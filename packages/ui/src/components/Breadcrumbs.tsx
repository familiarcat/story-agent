import { LcarsJumpBreadcrumb, type LcarsBreadcrumbProps, type BreadcrumbSegment } from './LcarsJumpBreadcrumb';

export type Crumb = {
  label: string;
  href?: string;
  icon?: string;
  quickJumps?: Array<{ label: string; href: string; icon?: string; desc?: string }>;
};

export function Breadcrumbs(props: LcarsBreadcrumbProps | { crumbs: Crumb[] }) {
  if ('crumbs' in props && props.crumbs) {
    return <LcarsJumpBreadcrumb crumbs={props.crumbs} action={'action' in props ? props.action : undefined} />;
  }
  return <LcarsJumpBreadcrumb {...(props as LcarsBreadcrumbProps)} />;
}

export default Breadcrumbs;
