import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, 'public');

const rawSiteUrl = (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://mivitrina.co').trim();
const siteUrl = rawSiteUrl.replace(/\/$/, '');

const routes = [
  '/',
  '/como-funciona',
  '/info-vender',
  '/info-comprar',
  '/terminos-y-condiciones',
  '/politica-de-privacidad',
  '/politica-de-cookies',
  '/login',
  '/register',
  '/forgot-password',
];

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt, 'utf8');

const nowIso = new Date().toISOString();
const urlEntries = routes
  .map((route) => {
    const loc = `${siteUrl}${route}`;
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${nowIso}</lastmod>`,
      '    <changefreq>daily</changefreq>',
      route === '/' ? '    <priority>1.0</priority>' : '    <priority>0.7</priority>',
      '  </url>',
    ].join('\n');
  })
  .join('\n');

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`;
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf8');

console.log('SEO files generated:', {
  robots: path.join(publicDir, 'robots.txt'),
  sitemap: path.join(publicDir, 'sitemap.xml'),
});
