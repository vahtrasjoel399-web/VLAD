'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  ArrowRight,
  Copy,
  Check,
  Pause,
  Play,
} from 'lucide-react';
import { safeLink, type Portfolio } from '@/lib/content';
import VideoCard from './video-card';
type Page = 'works' | 'contacts';
type Locale = 'en' | 'ru';

const COPY = {
  en: {
    skip: 'Skip to content',
    navLabel: 'Main navigation',
    works: 'Work',
    contacts: 'Contact',
    language: 'Language',
    heroPrimary: 'INDEPENDENT VIDEO CREATOR',
    heroSecondary: 'IMAGE / SOUND / FEELING',
    heroLineOne: 'BEYOND',
    heroLineTwo: 'THE FRAME.',
    chromeAlt: 'Sculptural liquid chrome form',
    viewWork: 'View selected work',
    selectedSection: 'SELECTED WORK',
    worksAria: 'Selected work',
    collection: 'Selected automotive films',
    demoCollection: 'Demo collection',
    empty: 'New work is coming soon.',
    demoText: 'Demo: six frames from the Sintel trailer by Blender Foundation.',
    demoDisclaimer: 'These are not the creator’s works.',
    original: 'Original ↗',
    clientsAria: 'Featured names',
    demoClientsAria: 'Demo logos',
    featured: 'FEATURED WITH',
    demoLogos: 'Demo logos · no collaborations implied',
    inFrame: 'Names in the frame',
    teaserEyebrow: 'THE NEXT FRAME IS OURS.',
    teaserOne: 'LET’S MAKE',
    teaserEmphasis: 'SOMETHING',
    teaserEnd: ' MOVE.',
    idea: 'Have an idea? Let’s give it form.',
    contactCta: 'START A CONVERSATION ↗',
    contactEyebrow: '03 / GET IN TOUCH',
    contactEyebrowSub: 'EVERY GOOD FILM STARTS WITH A CONVERSATION',
    contactHeadingOne: 'LET’S',
    contactHeadingTwo: 'TALK.',
    contactChromeAlt: 'Chrome sculpture',
    contactLeadOne: 'One idea.',
    contactLeadTwo: 'A thousand ways',
    contactLeadThree: 'to tell it.',
    choose: 'CHOOSE WHAT WORKS FOR YOU',
    phone: 'PHONE',
    notAdded: 'Not added',
    copyEmail: 'Copy email',
    copied: 'Email copied',
    copyFailed: 'Could not copy. Select the address manually.',
    demoContact:
      'Demo mode. Name, phone, email and social links appear after you add them.',
    back: 'Back to work',
    reduced: 'Reduced motion',
    motionOn: 'Enable motion',
    motionOff: 'Pause motion',
    creatorLabel: 'VIDEO CREATOR',
  },
  ru: {
    skip: 'К содержимому',
    navLabel: 'Основная навигация',
    works: 'Работы',
    contacts: 'Контакты',
    language: 'Язык',
    heroPrimary: 'НЕЗАВИСИМЫЙ ВИДЕОКРЕАТОР',
    heroSecondary: 'ОБРАЗ / ЗВУК / ОЩУЩЕНИЕ',
    heroLineOne: 'ЗА',
    heroLineTwo: 'КАДРОМ.',
    chromeAlt: 'Скульптурная форма из жидкого хрома',
    viewWork: 'Смотреть работы',
    selectedSection: 'ИЗБРАННЫЕ РАБОТЫ',
    worksAria: 'Избранные работы',
    collection: 'Избранные автомобильные ролики',
    demoCollection: 'Демонстрационная коллекция',
    empty: 'Новые работы скоро появятся здесь.',
    demoText: 'Демо: шесть кадров из трейлера Sintel от Blender Foundation.',
    demoDisclaimer: 'Это не работы автора сайта.',
    original: 'Оригинал ↗',
    clientsAria: 'Участники проектов',
    demoClientsAria: 'Демонстрационные логотипы',
    featured: 'В КАДРЕ С',
    demoLogos: 'Демо-логотипы · не сотрудничества',
    inFrame: 'Имена в кадре',
    teaserEyebrow: 'СЛЕДУЮЩИЙ КАДР — НАШ.',
    teaserOne: 'СОЗДАДИМ',
    teaserEmphasis: 'ДВИЖЕНИЕ',
    teaserEnd: '.',
    idea: 'Есть идея? Давайте придадим ей форму.',
    contactCta: 'НАЧАТЬ РАЗГОВОР ↗',
    contactEyebrow: '03 / СВЯЗАТЬСЯ',
    contactEyebrowSub: 'КАЖДЫЙ ХОРОШИЙ ФИЛЬМ НАЧИНАЕТСЯ С РАЗГОВОРА',
    contactHeadingOne: 'ДАВАЙТЕ',
    contactHeadingTwo: 'ОБСУДИМ.',
    contactChromeAlt: 'Хромированная скульптура',
    contactLeadOne: 'Одна идея.',
    contactLeadTwo: 'Тысяча способов',
    contactLeadThree: 'рассказать её.',
    choose: 'ВЫБЕРИТЕ УДОБНЫЙ СПОСОБ',
    phone: 'ТЕЛЕФОН',
    notAdded: 'Не добавлен',
    copyEmail: 'Скопировать email',
    copied: 'Email скопирован',
    copyFailed: 'Не удалось скопировать. Выделите адрес вручную.',
    demoContact:
      'Демонстрационный режим. Имя, телефон, email и соцсети появятся после добавления данных.',
    back: 'Вернуться к работам',
    reduced: 'Уменьшенное движение',
    motionOn: 'Включить движение',
    motionOff: 'Остановить движение',
    creatorLabel: 'ВИДЕОКРЕАТОР',
  },
} as const;

export default function PortfolioView({
  content,
  initialPage = 'works',
}: {
  content: Portfolio;
  initialPage?: Page;
}) {
  const [page, setPage] = useState<Page>(initialPage);
  const [active, setActive] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [copyState, setCopyState] = useState('');
  const [transition, setTransition] = useState(0);
  const [saveData, setSaveData] = useState(false);
  const [locale, setLocale] = useState<Locale>('en');
  const title = useRef<HTMLHeadingElement>(null);
  const t = COPY[locale];
  const works = [...content.works].sort((a, b) => a.order - b.order);
  const logos = [...content.logos].sort((a, b) => a.order - b.order);
  const instagram = content.socials.find(
    (social) =>
      social.name.toLowerCase().includes('instagram') ||
      social.url.toLowerCase().includes('instagram.com'),
  );
  const instagramUrl = safeLink(instagram?.url);
  const youtube = content.socials.find(
    (social) =>
      social.name.toLowerCase().includes('youtube') ||
      social.url.toLowerCase().includes('youtube.com') ||
      social.url.toLowerCase().includes('youtu.be'),
  );
  const youtubeUrl = safeLink(youtube?.url);
  const phoneHref = content.phone
    ? `tel:${content.phone.replace(/[^+\d]/g, '')}`
    : undefined;
  useEffect(() => {
    const savedLocale = localStorage.getItem('smolin-locale');
    if (savedLocale === 'ru') setLocale('ru');
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    setPaused(localStorage.getItem('frame-motion') === 'paused');
    setSaveData(
      Boolean(
        (navigator as Navigator & { connection?: { saveData?: boolean } })
          .connection?.saveData,
      ),
    );
    const pop = () => {
      setPage(location.pathname === '/contacts' ? 'contacts' : 'works');
      setActive(null);
      setPreview(null);
    };
    const hide = () => {
      if (document.hidden) {
        setPreview(null);
        document.querySelectorAll('video').forEach((v) => v.pause());
      }
    };
    addEventListener('popstate', pop);
    document.addEventListener('visibilitychange', hide);
    return () => {
      media.removeEventListener('change', update);
      removeEventListener('popstate', pop);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            io.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 },
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [page]);
  useEffect(() => {
    if (paused || reduced) setPreview(null);
  }, [paused, reduced]);
  const navigate = (event: React.MouseEvent<HTMLAnchorElement>, next: Page) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    if (next === page) {
      if (next === 'works')
        document
          .getElementById('works')
          ?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
      return;
    }
    setActive(null);
    setPreview(null);
    setPage(next);
    setTransition((x) => x + 1);
    history.pushState({}, '', next === 'contacts' ? '/contacts' : '/');
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => title.current?.focus({ preventScroll: true }));
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content.email);
      setCopyState(t.copied);
    } catch {
      setCopyState(t.copyFailed);
    }
    setTimeout(() => setCopyState(''), 4000);
  };
  const changeLocale = (next: Locale) => {
    setLocale(next);
    setCopyState('');
    localStorage.setItem('smolin-locale', next);
  };
  const toggleMotion = () => {
    const next = !paused;
    setPaused(next);
    localStorage.setItem('frame-motion', next ? 'paused' : 'playing');
  };
  const logo = (item: (typeof logos)[number], duplicate: boolean) => {
    const visual = item.image ? (
      <img
        src={item.image}
        alt={item.name}
        width="160"
        height="54"
        loading="lazy"
      />
    ) : (
      <span>{item.name}</span>
    );
    const href = safeLink(item.url);
    return href && !duplicate ? (
      <a href={href} key={item.name} target="_blank" rel="noreferrer">
        {visual}
        <ArrowUpRight size={12} />
      </a>
    ) : (
      <span className="logo-item" key={item.name}>
        {visual}
      </span>
    );
  };
  return (
    <main
      className={`${paused || reduced ? 'motion-paused' : ''} page-${page}`}
    >
      <a className="skip-link" href="#main-content">
        {t.skip}
      </a>
      <header>
        <a className="wordmark" href="/" onClick={(e) => navigate(e, 'works')}>
          {content.name}
          <span>®</span>
        </a>
        <div className="header-actions">
          <nav aria-label={t.navLabel}>
            <a
              href="/"
              aria-current={page === 'works' ? 'page' : undefined}
              onClick={(e) => navigate(e, 'works')}
            >
              {t.works} <sup>{String(works.length).padStart(2, '0')}</sup>
            </a>
            <a
              href="/contacts"
              aria-current={page === 'contacts' ? 'page' : undefined}
              onClick={(e) => navigate(e, 'contacts')}
            >
              {t.contacts} <ArrowUpRight size={14} />
            </a>
          </nav>
          <div className="language-switch" aria-label={t.language}>
            <button
              type="button"
              aria-pressed={locale === 'en'}
              onClick={() => changeLocale('en')}
            >
              EN
            </button>
            <span>/</span>
            <button
              type="button"
              aria-pressed={locale === 'ru'}
              onClick={() => changeLocale('ru')}
            >
              RU
            </button>
          </div>
        </div>
      </header>
      <div key={transition} className="page-content" id="main-content">
        {page === 'works' ? (
          <>
            <section className="hero">
              <h1 ref={title} tabIndex={-1}>
                <span className="title-mask">
                  <span>{t.heroLineOne}</span>
                </span>
                <span className="title-mask">
                  <span className="outline">{t.heroLineTwo}</span>
                </span>
              </h1>
              <img
                className="chrome"
                src="/chrome.webp"
                alt={t.chromeAlt}
                width="1200"
                height="800"
                fetchPriority="high"
              />
              <div className="hero-bottom">
                <p>
                  {locale === 'ru'
                    ? content.descriptionRu || content.description
                    : content.description}
                </p>
                <a href="#works">
                  {t.viewWork} <ArrowDown size={15} />
                </a>
              </div>
            </section>
            <section id="works" aria-label={t.worksAria}>
              <div className="section-label">
                <span>{t.works}</span>
                <span>{String(works.length).padStart(2, '0')}</span>
              </div>
              <div className="grid">
                {works.map((work, index) => (
                  <VideoCard
                    key={work.id}
                    work={work}
                    index={index}
                    locale={locale}
                    active={active === work.id}
                    preview={preview === work.id && !active}
                    canPreview={!paused && !reduced && !saveData && !active}
                    onActivate={() => {
                      document
                        .querySelectorAll('video')
                        .forEach((v) => v.pause());
                      setActive(work.id);
                      setPreview(null);
                    }}
                    onPreview={(on) => setPreview(on ? work.id : null)}
                  />
                ))}
              </div>
              {works.length === 0 && <p className="empty">{t.empty}</p>}
              {content.demo && (
                <p className="demo-note">
                  {t.demoText}{' '}
                  <a
                    href="https://creativecommons.org/licenses/by/3.0/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    CC BY 3.0 ↗
                  </a>
                  . {t.demoDisclaimer}{' '}
                  <a
                    href="https://durian.blender.org/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t.original}
                  </a>
                </p>
              )}
            </section>
            {logos.length > 0 && (
              <section
                className="collaborators reveal"
                aria-label={content.demo ? t.demoClientsAria : t.clientsAria}
              >
                <div className="section-label">
                  <span>{locale === 'ru' ? 'КЛИЕНТЫ' : 'CLIENTS'}</span>
                </div>
                <div className="marquee">
                  <div className="marquee-track">
                    <div className="marquee-group">
                      {logos.map((x) => logo(x, false))}
                    </div>
                    <div className="marquee-group" aria-hidden="true">
                      {logos.map((x) => logo(x, true))}
                    </div>
                  </div>
                </div>
              </section>
            )}
            <section className="contact-teaser reveal">
              <a href="/contacts" onClick={(e) => navigate(e, 'contacts')}>
                <span>
                  {locale === 'ru' ? 'ОБСУДИМ?' : 'LET’S TALK.'}
                </span>
                <ArrowUpRight strokeWidth={0.8} />
              </a>
            </section>
          </>
        ) : (
          <section className="contacts">
            <div className="contact-heading">
              <h1 ref={title} tabIndex={-1}>
                <span className="title-mask">
                  <span>{t.contactHeadingOne}</span>
                </span>
                <span className="title-mask">
                  <span className="outline">{t.contactHeadingTwo}</span>
                </span>
              </h1>
              <img
                className="contact-chrome"
                src="/chrome.webp"
                alt={t.contactChromeAlt}
                width="1200"
                height="800"
              />
            </div>
            <div className="contact-details">
              <p>{locale === 'ru' ? 'Напишите напрямую.' : 'Get in touch.'}</p>
              <div className="contact-links">
                <div className="contact-methods">
                  <div className="contact-method">
                    <span className="contact-icon" aria-hidden="true">
                      <img src="/media/contact-icons/instagram-chrome-transparent.png" alt="" width="96" height="96" />
                    </span>
                    <span className="contact-meta">INSTAGRAM</span>
                    {instagramUrl ? (
                      <a href={instagramUrl} target="_blank" rel="noreferrer">
                        {instagram?.name || 'Instagram'}
                        <ArrowUpRight size={18} />
                      </a>
                    ) : (
                      <span className="contact-unset">{t.notAdded}</span>
                    )}
                  </div>
                  <div className="contact-method">
                    <span className="contact-icon" aria-hidden="true">
                      <img src="/media/contact-icons/youtube-chrome-transparent.png" alt="" width="96" height="96" />
                    </span>
                    <span className="contact-meta">YOUTUBE</span>
                    {youtubeUrl ? (
                      <a href={youtubeUrl} target="_blank" rel="noreferrer">
                        {youtube?.name || 'YouTube'}
                        <ArrowUpRight size={18} />
                      </a>
                    ) : (
                      <span className="contact-unset">{t.notAdded}</span>
                    )}
                  </div>
                  <div className="contact-method">
                    <span className="contact-icon" aria-hidden="true">
                      <img src="/media/contact-icons/phone-chrome-transparent.png" alt="" width="96" height="96" />
                    </span>
                    <span className="contact-meta">{t.phone}</span>
                    {phoneHref ? (
                      <a href={phoneHref}>
                        {content.phone}
                        <ArrowUpRight size={18} />
                      </a>
                    ) : (
                      <span className="contact-unset">{t.notAdded}</span>
                    )}
                  </div>
                  <div className="contact-method">
                    <span className="contact-icon" aria-hidden="true">
                      <img src="/media/contact-icons/email-chrome-transparent.png" alt="" width="96" height="96" />
                    </span>
                    <span className="contact-meta">EMAIL</span>
                    {content.email ? (
                      <div className="contact-email">
                        <a href={`mailto:${content.email}`}>
                          {content.email}
                          <ArrowUpRight size={18} />
                        </a>
                        <button aria-label={t.copyEmail} onClick={copy}>
                          {copyState === t.copied ? (
                            <Check size={17} />
                          ) : (
                            <Copy size={17} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="contact-unset">{t.notAdded}</span>
                    )}
                  </div>
                </div>
                <div role="status" className="copy-feedback">
                  {copyState}
                </div>
                <div className="socials">
                  {content.socials
                    .filter(
                      (s) =>
                        safeLink(s.url) &&
                        !s.name.toLowerCase().includes('instagram') &&
                        !s.url.toLowerCase().includes('instagram.com'),
                    )
                    .map((s) => (
                      <a
                        key={s.name}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {s.name}
                        <ArrowUpRight size={15} />
                      </a>
                    ))}
                </div>
                {content.demo && <p className="demo-note">{t.demoContact}</p>}
              </div>
            </div>
            <a
              className="back-link"
              href="/"
              onClick={(e) => navigate(e, 'works')}
            >
              {t.back} <ArrowRight size={16} />
            </a>
          </section>
        )}
      </div>
      <footer>
        <span>{content.name}</span>
        <button
          className="motion-control"
          onClick={toggleMotion}
          aria-pressed={paused}
          disabled={reduced}
        >
          {paused || reduced ? <Play size={12} /> : <Pause size={12} />}{' '}
          {reduced ? t.reduced : paused ? t.motionOn : t.motionOff}
        </button>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </main>
  );
}
