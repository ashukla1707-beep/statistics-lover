export const siteConfig = {
  name: 'Statistics Lover',
  tagline: 'Learn • Practice • Succeed',
  description:
    'A focused statistics learning platform for live classes, recorded lectures, tests, PYQs, assignments and study resources.',
  phone: '9264927804',
  whatsappNumber: '919264927804',
  logoPath: '/brand/statistics-lover-logo.jpg?v=20261004-4',
} as const

export const navigationItems = [
  { label: 'Home', href: '#home' },
  { label: 'Platform', href: '#platform' },
  { label: 'Assessments', href: '#assessments' },
  { label: 'PYQs & Resources', href: '#resources' },
  { label: 'About', href: '#about' },
] as const
