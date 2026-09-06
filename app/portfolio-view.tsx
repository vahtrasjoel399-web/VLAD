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
  const title = useRef<HTMLHeadingElement>(null);
  const works = [...content.works].sort((a, b) => a.order - b.order);
  const logos = [...content.logos].sort((a, b) => a.order - b.order);
  useEffect(() => {
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
      setCopyState('Email скопирован');
    } catch {
      setCopyState('Не удалось скопировать. Выделите адрес вручную.');
    }
    setTimeout(() => setCopyState(''), 4000);
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
        К содержимому
      </a>
      <header>
        <a className="wordmark" href="/" onClick={(e) => navigate(e, 'works')}>
          {content.name}
          <span>®</span>
        </a>
        <nav aria-label="Основная навигация">
          <a
            href="/"
            aria-current={page === 'works' ? 'page' : undefined}
            onClick={(e) => navigate(e, 'works')}
          >
            Работы <sup>{String(works.length).padStart(2, '0')}</sup>
          </a>
          <a
            href="/contacts"
            aria-current={page === 'contacts' ? 'page' : undefined}
            onClick={(e) => navigate(e, 'contacts')}
          >
            Контакты <ArrowUpRight size={14} />
          </a>
        </nav>
      </header>
      <div key={transition} className="page-content" id="main-content">
        {page === 'works' ? (
          <>
            <section className="hero">
              <div className="eyebrow">
                INDEPENDENT VIDEO CREATOR <span>IMAGE / SOUND / FEELING</span>
              </div>
              <h1 ref={title} tabIndex={-1}>
                <span className="title-mask">
                  <span>BEYOND</span>
                </span>
                <span className="title-mask">
                  <span className="outline">THE FRAME.</span>
                </span>
              </h1>
              <img
                className="chrome"
                src="/chrome.webp"
                alt="Скульптурная форма из жидкого хрома"
                width="1200"
                height="800"
                fetchPriority="high"
              />
              <div className="hero-bottom">
                <p>{content.description}</p>
                <p>{content.roles}</p>
                <a href="#works">
                  Смотреть работы <ArrowDown size={15} />
                </a>
              </div>
            </section>
            <section id="works" aria-label="Избранные работы">
              <div className="section-label">
                <span>01 / SELECTED WORK</span>
                <span>
                  {content.demo
                    ? 'Демонстрационная коллекция'
                    : 'Избранные работы'}
                </span>
              </div>
              <div className="grid">
                {works.map((work, index) => (
                  <VideoCard
                    key={work.id}
                    work={work}
                    index={index}
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
              {works.length === 0 && (
                <p className="empty">Новые работы скоро появятся здесь.</p>
              )}
              {content.demo && (
                <p className="demo-note">
                  Демо: шесть кадров одного трейлера «Sintel», Blender
                  Foundation,{' '}
                  <a
                    href="https://creativecommons.org/licenses/by/3.0/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    CC BY 3.0 ↗
                  </a>
                  . Это не работы автора сайта.{' '}
                  <a
                    href="https://durian.blender.org/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Оригинал ↗
                  </a>
                </p>
              )}
            </section>
            {logos.length > 0 && (
              <section
                className="collaborators reveal"
                aria-label={
                  content.demo ? 'Демонстрационные логотипы' : 'Клиенты'
                }
              >
                <div className="section-label">
                  <span>02 / IN GOOD COMPANY</span>
                  <span>
                    {content.demo
                      ? 'Демо-логотипы · не сотрудничества'
                      : 'Вместе в кадре'}
                  </span>
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
              <span className="eyebrow">СЛЕДУЮЩИЙ КАДР — НАШ.</span>
              <a href="/contacts" onClick={(e) => navigate(e, 'contacts')}>
                <span>
                  LET’S MAKE
                  <br />
                  <em>SOMETHING</em> MOVE.
                </span>
                <ArrowUpRight strokeWidth={0.8} />
              </a>
              <div className="teaser-bottom">
                <span>Есть идея? Давайте придадим ей форму.</span>
                <span>ПЕРЕЙТИ К КОНТАКТАМ ↗</span>
              </div>
            </section>
          </>
        ) : (
          <section className="contacts">
            <div className="eyebrow">
              03 / GET IN TOUCH{' '}
              <span>EVERY GOOD FILM STARTS WITH A CONVERSATION</span>
            </div>
            <div className="contact-heading">
              <h1 ref={title} tabIndex={-1}>
                <span className="title-mask">
                  <span>LET’S</span>
                </span>
                <span className="title-mask">
                  <span className="outline">TALK.</span>
                </span>
              </h1>
              <img
                className="contact-chrome"
                src="/chrome.webp"
                alt="Хромированная скульптура"
                width="1200"
                height="800"
              />
            </div>
            <div className="contact-details">
              <p>
                Одна идея.
                <br />
                Тысяча способов
                <br />
                <em>рассказать её.</em>
              </p>
              <div className="contact-links">
                <span className="eyebrow">НАЧНЁМ С ПИСЬМА</span>
                {content.email ? (
                  <div className="email-row">
                    <a href={`mailto:${content.email}`}>
                      {content.email}
                      <ArrowUpRight />
                    </a>
                    <button aria-label="Скопировать email" onClick={copy}>
                      {copyState === 'Email скопирован' ? (
                        <Check size={19} />
                      ) : (
                        <Copy size={19} />
                      )}
                    </button>
                  </div>
                ) : (
                  <p className="unset-contact">Email пока не добавлен</p>
                )}
                <div role="status" className="copy-feedback">
                  {copyState}
                </div>
                <div className="socials">
                  {content.socials
                    .filter((s) => safeLink(s.url))
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
                {content.demo && (
                  <p className="demo-note">
                    Демонстрационный режим. Имя, email и соцсети
                    <br />
                    появятся после добавления ваших данных.
                  </p>
                )}
              </div>
            </div>
            <a
              className="back-link"
              href="/"
              onClick={(e) => navigate(e, 'works')}
            >
              Вернуться к работам <ArrowRight size={16} />
            </a>
          </section>
        )}
      </div>
      <footer>
        <span>{content.name} / VIDEO CREATOR</span>
        <button
          className="motion-control"
          onClick={toggleMotion}
          aria-pressed={paused}
          disabled={reduced}
        >
          {paused || reduced ? <Play size={12} /> : <Pause size={12} />}{' '}
          {reduced
            ? 'Уменьшенное движение'
            : paused
              ? 'Включить движение'
              : 'Остановить движение'}
        </button>
        <span>
          {content.demo ? 'DEMO EDITION' : 'INDEPENDENT VISION'} ©{' '}
          {new Date().getFullYear()}
        </span>
      </footer>
    </main>
  );
}
