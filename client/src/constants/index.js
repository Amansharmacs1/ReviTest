export const APP_CONFIG = {
  NAME: 'REVITEST',
  TAGLINE: 'Online Examination & Assessment Management SaaS',
  PHASE: 'Phase 1: Project Foundation',
  VERSION: '1.0.0',
  CONCURRENCY_TARGET: '1,000+ Concurrent Examinees',
};

export const NAV_LINKS = [
  { label: 'Overview', href: '#overview' },
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Architecture', href: '#architecture' },
  { label: 'System Health', href: '#system-health' },
];

export const FUTURE_CAPABILITIES = [
  {
    id: 'multi-tenancy',
    title: 'Multi-Tenant Workspaces',
    description:
      'Isolated organizational domains for universities, colleges, coaching institutes, and enterprise recruitment teams with custom branding and role-based policies.',
    tag: 'Tenant Isolation',
    iconName: 'Building2',
  },
  {
    id: 'high-concurrency',
    title: '1,000+ Concurrent Examinees',
    description:
      'Engineered from the ground up to support synchronized high-load exam starts, burst answer submissions, and connection resilience without database bottlenecks.',
    tag: 'High Performance',
    iconName: 'Zap',
  },
  {
    id: 'realtime-recovery',
    title: 'Autosave & State Recovery',
    description:
      'Zero-data-loss client-side buffering and background delta syncing ensure examinees resume seamlessly during internet drops or browser crashes.',
    tag: 'Fault Tolerant',
    iconName: 'RefreshCw',
  },
  {
    id: 'proctoring',
    title: 'Browser Integrity & Proctoring',
    description:
      'Full-screen lock enforcement, tab-switch monitoring, copy-paste prevention, and automated behavioral anomaly logging for high-integrity testing.',
    tag: 'Integrity',
    iconName: 'ShieldAlert',
  },
  {
    id: 'auto-evaluation',
    title: 'Instant Evaluation & Analytics',
    description:
      'Automated grading of objective MCQs with instantaneous rank calculation, question difficulty profiling, and percentile score distribution.',
    tag: 'Automated',
    iconName: 'BarChart3',
  },
  {
    id: 'integrations',
    title: 'Google Sheets & Data Sync',
    description:
      'Two-way student roster imports and direct examination result streaming directly into Google Sheets and organizational SIS/LMS endpoints.',
    tag: 'Ecosystem',
    iconName: 'Sheet',
  },
];
