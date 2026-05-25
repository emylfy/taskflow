import * as React from 'react';
import Link from 'next/link';
import { I } from '@/components/icons/Icons';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Badge';
import { AvatarStack } from '@/components/ui/AvatarStack';
import { PRIO_MAP } from '@/components/ui/Badge';
import styles from './landing.module.css';

const ADVANTAGES = [
  {
    icon: <I.Users size={22} />,
    title: 'Совместное редактирование',
    desc: 'Курсоры участников, живые изменения и история версий в каждой задаче.',
  },
  {
    icon: <I.Shield size={22} />,
    title: 'Данные в РФ',
    desc: 'Хранение на серверах в Москве. Соответствие 152-ФЗ и требованиям к персональным данным.',
  },
  {
    icon: <I.CreditCard size={22} />,
    title: 'Оплата в рублях',
    desc: 'ЮKassa, СБП, МИР, ЮMoney. Закрывающие документы в электронном виде.',
  },
];

const KANBAN_PREVIEW = [
  {
    title: 'Сделать',
    color: '#8B939C',
    count: 4,
    cards: [
      { t: 'Подготовить макеты главной страницы', tag: 'дизайн', prio: 'high' as const },
      { t: 'Согласовать техническое задание с заказчиком', tag: 'планирование', prio: 'urgent' as const },
      { t: 'Обновить схему базы данных', tag: 'архитектура', prio: 'normal' as const },
    ],
  },
  {
    title: 'В работе',
    color: '#2B5FA4',
    count: 3,
    cards: [
      { t: 'Настроить развёртывание через Docker Compose', tag: 'инфраструктура', prio: 'high' as const },
      { t: 'Провести исследование пользователей', tag: 'продукт', prio: 'normal' as const },
    ],
  },
  {
    title: 'На проверке',
    color: '#D4A017',
    count: 2,
    cards: [{ t: 'Вёрстка страницы тарифов', tag: 'вёрстка', prio: 'normal' as const }],
  },
  {
    title: 'Готово',
    color: '#2E7D3E',
    count: 6,
    cards: [{ t: 'Подключение ЮKassa', tag: 'платежи', prio: 'normal' as const }],
  },
];

const PLANS = [
  {
    name: 'Бесплатный',
    price: '0 ₽',
    suffix: 'навсегда',
    features: ['До 3 пользователей', 'До 2 проектов', 'История версий 7 дней', 'Канбан и комментарии'],
    cta: 'Начать бесплатно',
    variant: 'secondary' as const,
  },
  {
    name: 'Команда',
    price: '790 ₽',
    suffix: 'в месяц',
    features: ['До 20 пользователей', 'Безлимит проектов', 'История версий 90 дней', 'Журнал действий'],
    cta: 'Выбрать Команду',
    variant: 'primary' as const,
    badge: 'Популярный',
  },
  {
    name: 'Бизнес',
    price: '2 900 ₽',
    suffix: 'в месяц',
    features: ['Безлимит пользователей и проектов', 'SSO через Яндекс ID', 'Экспорт журнала (152-ФЗ)', 'Приоритетная поддержка'],
    cta: 'Перейти на Бизнес',
    variant: 'secondary' as const,
  },
];

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Logo size={20} />
        <nav className={styles.nav}>
          <a href="#features">Возможности</a>
          <a href="#pricing">Тарифы</a>
          <a href="#security">Безопасность</a>
          <a href="#business">Для бизнеса</a>
        </nav>
        <div className={styles.spacer} />
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Войти
          </Button>
        </Link>
        <div style={{ width: 10 }} />
        <Link href="/register">
          <Button variant="primary" size="sm">
            Начать бесплатно
          </Button>
        </Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <span className={styles.heroDot} />
          Данные хранятся в РФ · 152-ФЗ
        </div>
        <h1 className={styles.heroTitle}>
          Совместная работа над задачами.<br />
          <span className={styles.heroTitleMuted}>В реальном времени. В рублях. В России.</span>
        </h1>
        <p className={styles.heroText}>
          Веб-приложение для команд с оплатой через ЮKassa и размещением данных в РФ. Канбан, карточки задач,
          чаты и совместное редактирование — в одном месте.
        </p>
        <div className={styles.heroCta}>
          <Link href="/register">
            <Button variant="primary" size="lg">Начать бесплатно</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">Войти</Button>
          </Link>
        </div>
        <div className={styles.heroNote}>Без карты · До 3 пользователей навсегда</div>
      </section>

      <section className={styles.previewWrap}>
        <div className={styles.laptop}>
          <div className={styles.laptopTop}>
            <span /><span /><span />
          </div>
          <div className={styles.board}>
            {KANBAN_PREVIEW.map((col) => (
              <div key={col.title} className={styles.col}>
                <div className={styles.colHead}>
                  <span className={styles.colDot} style={{ background: col.color }} />
                  <span className={styles.colTitle}>{col.title}</span>
                  <span className={styles.colCount}>{col.count}</span>
                </div>
                <div className={styles.cards}>
                  {col.cards.map((c, i) => (
                    <div key={i} className={styles.card}>
                      <div className={styles.cardBar} style={{ background: PRIO_MAP[c.prio].color }} />
                      <div className={styles.cardText}>{c.t}</div>
                      <div className={styles.cardRow}>
                        <Tag>{c.tag}</Tag>
                        <div style={{ flex: 1 }} />
                        <AvatarStack names={['Иван Соколов', 'Мария Петрова']} size={14} max={2} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.laptopBase} />
      </section>

      <section id="features" className={styles.features}>
        {ADVANTAGES.map((a) => (
          <article key={a.title} className={styles.feature}>
            <div className={styles.featureIcon}>{a.icon}</div>
            <div className={styles.featureTitle}>{a.title}</div>
            <div className={styles.featureDesc}>{a.desc}</div>
          </article>
        ))}
      </section>

      <section id="security" className={styles.security}>
        <div className={styles.sectionHead}>
          <h2>Безопасность и соответствие 152-ФЗ</h2>
          <p>Размещение данных в России, шифрование, регулярные резервные копии и аудит действий.</p>
        </div>
        <div className={styles.securityGrid}>
          {[
            { icon: <I.Shield size={22} />, title: 'Данные в РФ', desc: 'Серверы в Москве, соответствие требованиям 152-ФЗ по хранению персональных данных.' },
            { icon: <I.Lock size={22} />, title: 'TLS 1.3 на всех каналах', desc: 'Сертификаты Let’s Encrypt, автоматическое продление, шифрование трафика от клиента до базы.' },
            { icon: <I.Archive size={22} />, title: 'Ежесуточное резервное копирование', desc: 'Ротация копий 7 дней, запуск восстановления — за минуты.' },
            { icon: <I.Log size={22} />, title: 'Журнал действий', desc: 'Полная история изменений задач, участников и подписок с возможностью экспорта.' },
          ].map((x) => (
            <article key={x.title} className={styles.feature}>
              <div className={styles.featureIcon}>{x.icon}</div>
              <div className={styles.featureTitle}>{x.title}</div>
              <div className={styles.featureDesc}>{x.desc}</div>
            </article>
          ))}
        </div>
      </section>

      <section id="business" className={styles.business}>
        <div className={styles.businessCard}>
          <div className={styles.businessInfo}>
            <div className={styles.businessBadge}>Для бизнеса</div>
            <h2>TaskFlow Enterprise</h2>
            <p>
              Единый вход через корпоративный Яндекс ID или SAML, SLA 99,9 %, персональный менеджер и
              расширенный журнал действий. Поможем перенести существующие проекты из других систем.
            </p>
            <ul className={styles.businessList}>
              <li><I.Check size={16} stroke="#2E7D3E" />Без ограничений по участникам и проектам</li>
              <li><I.Check size={16} stroke="#2E7D3E" />Единый вход (SSO) через SAML 2.0</li>
              <li><I.Check size={16} stroke="#2E7D3E" />Выделенный канал поддержки</li>
              <li><I.Check size={16} stroke="#2E7D3E" />Закрывающие документы в электронном виде</li>
            </ul>
            <div className={styles.businessCta}>
              <Link href="/register">
                <Button variant="primary" size="lg">Попробовать Бизнес 14 дней</Button>
              </Link>
              <a href="mailto:sales@taskflow.ru">
                <Button variant="secondary" size="lg">Связаться с отделом продаж</Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className={styles.pricing}>
        <div className={styles.pricingHead}>
          <h2>Прозрачные тарифы</h2>
          <div>Без скрытых платежей. Оплата в рублях через ЮKassa.</div>
        </div>
        <div className={styles.plans}>
          {PLANS.map((p) => (
            <div key={p.name} className={`${styles.plan} ${p.badge ? styles.planFeatured : ''}`}>
              {p.badge && <div className={styles.planBadge}>{p.badge}</div>}
              <div className={styles.planName}>{p.name}</div>
              <div className={styles.planPrice}>
                <span className={styles.planPriceValue}>{p.price}</span>
                <span className={styles.planPriceSuffix}>{p.suffix}</span>
              </div>
              <Link href="/pricing">
                <Button variant={p.variant} block>
                  {p.cta}
                </Button>
              </Link>
              <div className={styles.planSep} />
              <ul className={styles.planFeatures}>
                {p.features.map((f) => (
                  <li key={f}>
                    <I.Check size={16} stroke="#2E7D3E" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Logo size={18} />
            <span className={styles.footerCopy}>© 2026 TaskFlow. Все права защищены.</span>
          </div>
          <nav className={styles.footerNav}>
            <a href="/legal/privacy">Политика персональных данных</a>
            <span className={styles.footerSep}>·</span>
            <a href="/legal/terms">Договор-оферта</a>
            <span className={styles.footerSep}>·</span>
            <a href="/legal/152-fz">152-ФЗ</a>
            <span className={styles.footerSep}>·</span>
            <a href="mailto:support@taskflow.ru">Поддержка</a>
          </nav>
          <div className={styles.footerRegion}>Данные в РФ</div>
        </div>
      </footer>
    </div>
  );
}
