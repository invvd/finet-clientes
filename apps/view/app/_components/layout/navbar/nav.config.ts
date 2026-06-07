export type NavItem = { label: string; href: string; children?: NavItem[] };

export const navItems: NavItem[] = [
  {
    label: 'Hogar',
    href: '/hogar',
    children: [
      { label: 'Internet hogar', href: '/hogar/internet' },
      { label: 'TV digital', href: '/hogar/tv' },
      { label: 'Internet + TV', href: '/hogar/duo' },
    ],
  },
  { label: 'Planes', href: '/planes' },
  {
    label: 'TV',
    href: '/tv',
    children: [
      { label: 'Canales', href: '/tv/canales' },
      { label: 'Parrilla', href: '/tv/parrilla' },
    ],
  },
  { label: 'Cobertura', href: '/cobertura' },
  { label: 'Ayuda', href: '/ayuda' },
];

export const audienceSwitch = [
  { label: 'Personas', href: '/' },
  { label: 'Empresas', href: '/empresas' },
];
