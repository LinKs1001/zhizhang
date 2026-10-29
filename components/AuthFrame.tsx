import { BrandIcon } from '@/components/BrandIcon';

export function AuthFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="auth-screen">
      <div className="auth-orb auth-orb-a" />
      <div className="auth-orb auth-orb-b" />
      <span className="auth-star auth-star-a">✦</span>
      <span className="auth-star auth-star-b">✦</span>
      <section className="auth-panel">
        <div className="auth-brand"><BrandIcon size={88} variant="login" /><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
        <div className="auth-card">{children}</div>
        <p className="auth-note">家庭收支记录 · 数据仅你与家人可见</p>
      </section>
    </main>
  );
}

