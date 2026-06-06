export type FooterLink = { label: string; href: string; icon?: string };
export type FooterColumn = { title: string; links: FooterLink[] };

export const footerColumns: FooterColumn[] = [
  {
    title: 'Acciones',
    links: [
      { label: 'Paga tu cuenta', href: '/pagar', icon: 'credit-card' },
      { label: 'Test de velocidad', href: '/velocidad', icon: 'gauge' },
      { label: 'Cobertura', href: '/cobertura', icon: 'map-pin' },
      { label: 'Portal Cliente', href: '/perfil', icon: 'user' },
    ],
  },
  {
    title: 'Te ayudamos',
    links: [
      { label: 'WhatsApp', href: 'https://wa.me/56945002319', icon: 'whatsapp' },
      { label: 'Soporte técnico', href: '/soporte' },
      { label: 'Reportar falla', href: '/reportar' },
      { label: 'FAQs', href: '/faqs' },
    ],
  },
  {
    title: 'Hogar',
    links: [
      { label: 'Internet hogar', href: '/hogar/internet' },
      { label: 'TV digital', href: '/hogar/tv' },
      { label: 'Internet + TV', href: '/hogar/duo' },
      { label: 'Canales', href: '/tv/canales' },
    ],
  },
  {
    title: 'Empresas',
    links: [
      { label: 'Internet empresas', href: '/empresas/internet' },
      { label: 'Cotizador', href: '/empresas/cotizador' },
    ],
  },
];

export const legalLinks: FooterLink[] = [
  { label: 'Términos', href: '/legal/terminos' },
  { label: 'Privacidad', href: '/legal/privacidad' },
  { label: 'Ley 21.398', href: '/legal/ley-21398' },
  { label: 'Reglamento de reclamos', href: '/legal/reclamos' },
  { label: 'Subtel', href: 'https://www.subtel.gob.cl/' },
];
