import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface Props {
  src: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}

/** Lazy-loaded image with a quiet placeholder when there is no image or it fails to load. */
export default function SmartImage({ src, alt, className = '', priority = false }: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-crumb text-wheat ${className}`} role="img" aria-label={alt}>
        <ImageOff className="h-8 w-8 opacity-60" aria-hidden />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
