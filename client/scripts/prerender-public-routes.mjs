import fs from 'node:fs';
import path from 'node:path';

const distDir = path.join(process.cwd(), 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.warn('prerender skipped: dist/index.html not found');
  process.exit(0);
}

const routeSeo = {
  '/': {
    title: 'MiVitrina | Marketplace',
    description: 'Compra y vende productos de forma segura en MiVitrina.',
  },
  '/como-funciona': {
    title: 'Cómo funciona | MiVitrina',
    description: 'Conoce cómo comprar y vender en MiVitrina paso a paso.',
  },
  '/info-vender': {
    title: 'Información para vender | MiVitrina',
    description: 'Guía para vendedores y configuración de cobros en MiVitrina.',
  },
  '/info-comprar': {
    title: 'Información para comprar | MiVitrina',
    description: 'Guía para compradores y proceso de pago en MiVitrina.',
  },
  '/terminos-y-condiciones': {
    title: 'Términos y condiciones | MiVitrina',
    description: 'Términos y condiciones de uso de MiVitrina.',
  },
  '/politica-de-privacidad': {
    title: 'Política de privacidad | MiVitrina',
    description: 'Política de privacidad y tratamiento de datos de MiVitrina.',
  },
  '/politica-de-cookies': {
    title: 'Política de cookies | MiVitrina',
    description: 'Información sobre cookies y tecnologías de seguimiento.',
  },
};

const template = fs.readFileSync(indexPath, 'utf8');

for (const [route, seo] of Object.entries(routeSeo)) {
  if (route === '/') continue;

  const routeDir = path.join(distDir, route.replace(/^\//, ''));
  fs.mkdirSync(routeDir, { recursive: true });

  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${seo.title}</title>`);

  if (/<meta\s+name="description"\s+content="[^"]*"\s*\/>/i.test(html)) {
    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/i,
      `<meta name="description" content="${seo.description}" />`
    );
  }

  fs.writeFileSync(path.join(routeDir, 'index.html'), html, 'utf8');
}

console.log('Public routes prerendered into dist for static hosting.');
