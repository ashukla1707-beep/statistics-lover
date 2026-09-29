export const siteConfig = {
  name: 'Statistics Lover',
  tagline: 'Learn • Practice • Succeed',
  description:
    'A focused statistics learning platform for live classes, recorded lectures, tests, PYQs and study material.',
  phone: '9264927804',
  whatsappNumber: '919264927804',
  logoPath: '/brand/statistics-lover-logo.svg',
} as const

export const navigationItems = [
  { label: 'Home', href: '#home' },
  { label: 'Courses', href: '#courses' },
  { label: 'Free Content', href: '#free-content' },
  { label: 'Test Series', href: '#test-series' },
  { label: 'PYQs', href: '#pyqs' },
  { label: 'Study Material', href: '#study-material' },
  { label: 'About', href: '#about' },
] as const
