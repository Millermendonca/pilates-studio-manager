import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Studio Pilates Harmonia',
    short_name: 'Studio Pilates',
    description: 'Aplicativo do Aluno - Studio Pilates Harmonia',
    start_url: '/aluno-app',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#4f979a',
    orientation: 'portrait',
    icons: [
      {
        src: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=192&auto=format&fit=crop&q=80',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=512&auto=format&fit=crop&q=80',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
