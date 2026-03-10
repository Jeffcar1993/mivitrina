export interface SeoPayload {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  robots?: string;
}

const DEFAULT_SITE_NAME = 'MiVitrina';

const getSiteUrl = (): string => {
  const fromEnv = String(import.meta.env.VITE_SITE_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return window.location.origin;
};

const upsertMeta = (selector: string, attribute: 'name' | 'property', key: string, content: string) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const upsertCanonical = (href: string) => {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
};

export const applySeo = (payload: SeoPayload): void => {
  const siteUrl = getSiteUrl();
  const title = payload.title ? `${payload.title} | ${DEFAULT_SITE_NAME}` : DEFAULT_SITE_NAME;
  const description = payload.description || 'Marketplace confiable para comprar y vender productos en Colombia.';

  document.title = title;
  upsertMeta('meta[name="description"]', 'name', 'description', description);
  upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', DEFAULT_SITE_NAME);
  upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', payload.ogTitle || title);
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', payload.ogDescription || description);
  upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', payload.ogTitle || title);
  upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', payload.ogDescription || description);

  if (payload.robots) {
    upsertMeta('meta[name="robots"]', 'name', 'robots', payload.robots);
  }

  if (payload.ogImage) {
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', payload.ogImage);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', payload.ogImage);
  }

  const canonicalPath = payload.canonicalPath || window.location.pathname;
  upsertCanonical(`${siteUrl}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`);
};

export const upsertJsonLd = (id: string, data: Record<string, unknown>): void => {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
};

export const removeJsonLd = (id: string): void => {
  const script = document.getElementById(id);
  if (script && script.parentElement) {
    script.parentElement.removeChild(script);
  }
};
