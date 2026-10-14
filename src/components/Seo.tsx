import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

interface Props {
  title?: string;
  description?: string;
  image?: string | null;
}

export default function Seo({ title, description, image }: Props) {
  const { settings } = useSettings();
  const { pathname } = useLocation();
  const site = ((import.meta.env.VITE_SITE_URL as string | undefined) || '').replace(/\/$/, '');
  const fullTitle = title ? `${title} | ${settings.business_name}` : settings.seo_title;
  const desc = description || settings.seo_description;
  const canonical = site ? `${site}${pathname === '/' ? '/' : pathname}` : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {canonical && <link rel="canonical" href={canonical} />}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      {canonical && <meta property="og:url" content={canonical} />}
      {image && <meta property="og:image" content={image} />}
    </Helmet>
  );
}
