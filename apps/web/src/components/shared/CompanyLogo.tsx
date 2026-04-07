// apps/web/src/components/CompanyLogo.tsx
import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Globe } from 'lucide-react';

interface CompanyLogoProps {
  domain: string;
  size?: number;
  format?: 'png' | 'jpg' | 'webp';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  fallbackIcon?: React.ReactNode;
}

export function CompanyLogo({
  domain,
  size = 128,
  format = 'webp',
  theme = 'dark',
  className,
  fallbackIcon = <Globe size={16} />
}: CompanyLogoProps) {
  const [error, setError] = useState(false);
  const token = import.meta.env.VITE_LOGO_DEV_TOKEN || 'pk_logo_dev_placeholder';
  
  // Construct Logo.dev URL
  // https://img.logo.dev/{domain}?token={pk}&size={s}&format={f}&theme={t}
  const logoUrl = `https://img.logo.dev/${domain}?token=${token}&size=${size}&format=${format}&theme=${theme}`;

  if (error || !domain) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-surface-container-high text-on-surface-variant/40",
        className
      )}>
        {fallbackIcon}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={`${domain} logo`}
      loading="lazy"
      onError={() => setError(true)}
      className={cn("object-contain", className)}
      style={{ width: size / 4, height: size / 4 }} // Scale down for high-res look
    />
  );
}
