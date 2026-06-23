import * as React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header
        style={{
          padding: '20px 32px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
          <Logo size={20} href={null} />
        </Link>
        <div style={{ flex: 1 }} />
        <nav style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--text-2)' }}>
          <Link href="/legal/privacy" style={{ color: 'inherit' }}>
            Политика персональных данных
          </Link>
          <Link href="/legal/terms" style={{ color: 'inherit' }}>
            Договор-оферта
          </Link>
          <Link href="/legal/152-fz" style={{ color: 'inherit' }}>
            152-ФЗ
          </Link>
        </nav>
      </header>
      <main
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '40px 24px 80px',
          fontSize: 15,
          lineHeight: 1.65,
          color: 'var(--text)',
        }}
      >
        {children}
      </main>
    </div>
  );
}
