// Writes public/sitemap.xml and public/robots.txt at build time.
// A sitemap needs absolute URLs, so it is only generated when VITE_SITE_URL is set.
import { writeFileSync } from 'node:fs';

const site = (process.env.VITE_SITE_URL || '').replace(/\/$/, '');
const routes = ['/', '/products', '/promotions', '/branches', '/about', '/contact'];

let robots = 'User-agent: *\nAllow: /\nDisallow: /admin\n';

if (site) {
  const urls = routes.map((r) => `  <url><loc>${site}${r === '/' ? '/' : r}</loc></url>`).join('\n');
  writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  robots += `Sitemap: ${site}/sitemap.xml\n`;
  console.log('sitemap.xml written for', site);
} else {
  console.log('VITE_SITE_URL not set: skipping sitemap.xml');
}
writeFileSync('public/robots.txt', robots);
