import Image from 'next/image';

export function BrandIcon({ size = 42, className = '', variant = 'app' }: { size?: number; className?: string; variant?: 'app' | 'login' }) {
  const src = variant === 'login' ? '/icons/login-icon.png' : '/icons/icon-192.png';
  return <Image className={`brand-icon ${className}`} src={src} width={size} height={size} alt="智账图标" priority />;
}
