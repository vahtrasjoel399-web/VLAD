'use client';
import { useEffect, useRef, useState } from 'react';
import type Hls from 'hls.js';
import { Play, ArrowUpRight } from 'lucide-react';
import { posterSource, videoSource, type Work } from '@/lib/content';
export default function VideoCard({
  work,
  index,
  active,
  preview,
  canPreview,
  onActivate,
  onPreview,
}: {
  work: Work;
  index: number;
  active: boolean;
  preview: boolean;
  canPreview: boolean;
  onActivate: () => void;
  onPreview: (on: boolean) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const hls = useRef<Hls | null>(null);
  const generation = useRef(0);
  const mode = useRef({ active, preview });
  mode.current = { active, preview };
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [imageError, setImageError] = useState(false);
  const source = videoSource(work);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const id = ++generation.current;
    let disposed = false;
    if (!active && !preview) {
      v.pause();
      v.removeAttribute('src');
      v.load();
      hls.current?.destroy();
      hls.current = null;
      setReady(false);
      setLoading(false);
      setBlocked(false);
      return;
    }
    setError('');
    setBlocked(false);
    setLoading(true);
    v.muted = !active;
    v.controls = active;
    const play = () => {
      if (disposed || id !== generation.current) return;
      v.play().catch(() => {
        if (!disposed) {
          setBlocked(true);
          setLoading(false);
        }
      });
    };
    if (
      source.includes('.m3u8') &&
      !v.canPlayType('application/vnd.apple.mpegurl')
    ) {
      import('hls.js')
        .then(({ default: HLS }) => {
          if (disposed) return;
          if (!HLS.isSupported()) {
            setError('Этот браузер не поддерживает потоковое видео.');
            setLoading(false);
            return;
          }
          const player = new HLS({
            maxBufferLength: 15,
            maxMaxBufferLength: 30,
          });
          hls.current = player;
          player.on(HLS.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setError('Не удалось загрузить видео. Попробуйте ещё раз.');
              setLoading(false);
            }
          });
          player.loadSource(source);
          player.attachMedia(v);
          player.on(HLS.Events.MANIFEST_PARSED, play);
        })
        .catch(() => {
          setError('Не удалось загрузить плеер.');
          setLoading(false);
        });
    } else {
      v.src = source;
      play();
    }
    return () => {
      disposed = true;
      v.pause();
      hls.current?.destroy();
      hls.current = null;
    };
  }, [active, preview, source]);
  const start = () => {
    onPreview(false);
    onActivate();
    if (active) {
      const v = video.current;
      if (v) {
        setError('');
        setBlocked(false);
        setLoading(true);
        v.load();
        v.play().catch(() => {
          setBlocked(true);
          setLoading(false);
        });
      }
    }
  };
  const onLoaded = () => {
    if (preview && video.current)
      video.current.currentTime = Math.min(
        work.previewStart || 1,
        Math.max(0, video.current.duration - 1),
      );
  };
  const retry = () => {
    const v = video.current;
    if (!v) return;
    setBlocked(false);
    setError('');
    setLoading(true);
    if (v.error) {
      hls.current?.startLoad();
      v.load();
    }
    v.play().catch(() => {
      setBlocked(true);
      setLoading(false);
    });
  };
  return (
    <article
      className="work reveal"
      style={{ '--delay': `${(index % 3) * 85}ms` } as React.CSSProperties}
    >
      <div
        className={`frame ${active ? 'is-active' : ''} ${ready ? 'is-ready' : ''}`}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse' && canPreview && !active)
            onPreview(true);
        }}
        onPointerLeave={() => onPreview(false)}
      >
        <img
          className={`poster ${ready && (active || preview) ? 'concealed' : ''}`}
          src={imageError ? '/chrome.webp' : posterSource(work)}
          onError={() => setImageError(true)}
          alt={`Кадр из ${work.title}`}
          loading={index < 3 ? 'eager' : 'lazy'}
          width="960"
          height="600"
        />
        <video
          ref={video}
          className={ready ? 'visible' : ''}
          preload="none"
          playsInline
          controls={active}
          muted={!active}
          aria-label={work.title}
          onLoadedMetadata={onLoaded}
          onPlaying={() => {
            setReady(true);
            setLoading(false);
            setBlocked(false);
          }}
          onWaiting={() => {
            if (mode.current.active) setLoading(true);
          }}
          onCanPlay={() => setLoading(false)}
          onError={() => {
            if (mode.current.active || mode.current.preview) {
              setError('Не удалось загрузить видео. Проверьте соединение.');
              setLoading(false);
            }
          }}
          onTimeUpdate={() => {
            const v = video.current;
            if (v && preview && v.currentTime > (work.previewStart || 1) + 4)
              v.currentTime = work.previewStart || 1;
          }}
          onEnded={() => {
            setReady(false);
            setBlocked(true);
          }}
        >
          {work.captions && (
            <track
              kind="captions"
              src={work.captions}
              srcLang="ru"
              label="Русский"
            />
          )}
        </video>
        {!active && (
          <button
            className="video-start"
            onClick={start}
            aria-label={`Смотреть ${work.title}`}
          >
            <span className="frame-index">
              /{String(index + 1).padStart(2, '0')}
            </span>
            <span className="video-kind">
              {work.demo ? 'ДЕМО / OPEN MOVIE' : work.kind}
            </span>
            <span className="play-disc">
              <Play size={19} fill="currentColor" strokeWidth={1} />
            </span>
            <span className="hover-copy">
              СМОТРЕТЬ <ArrowUpRight size={15} />
            </span>
            <span className="duration">{work.duration}</span>
          </button>
        )}
        {active && loading && !error && !blocked && (
          <div className="loading" role="status">
            Загрузка видео…
          </div>
        )}
        {active && (error || blocked) && (
          <div className="video-error" role="status">
            <span>{error || 'Нажмите, чтобы продолжить'}</span>
            <button onClick={retry}>
              <Play size={15} />
              {error ? 'Повторить' : 'Воспроизвести'}
            </button>
          </div>
        )}
      </div>
      <div className="caption">
        <h2>{work.title}</h2>
        <span>{String(index + 1).padStart(2, '0')}</span>
      </div>
      <div className="subcaption">
        <span>{work.client}</span>
        <span>{work.kind}</span>
      </div>
    </article>
  );
}
