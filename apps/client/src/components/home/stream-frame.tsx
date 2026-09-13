'use client';

// строится только в браузере: twitch требует parent, а на сервере адреса нет
export function StreamFrame({ url, className }: { url: string; className?: string }) {
  const source = embedSource(url, window.location.hostname);

  if (!source) {
    return (
      <div className="placeholder flex h-full w-full items-center justify-center">
        <span className="hint">Ссылка на трансляцию не разобрана: нужен youtube или twitch.</span>
      </div>
    );
  }

  return (
    <iframe
      src={source}
      title="трансляция"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      className={className}
    />
  );
}

const YOUTUBE_PATHS = ['live', 'shorts', 'embed', 'v'];

// понимаются обычные, короткие и живые ссылки youtube и каналы twitch
export function embedSource(url: string, pageHost: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');
    const parts = parsed.pathname.split('/').filter(Boolean);

    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const id = parsed.searchParams.get('v') ?? (parts[0] && YOUTUBE_PATHS.includes(parts[0]) ? parts[1] : undefined);

      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
    }

    if (host === 'youtu.be') {
      return parts[0] ? `https://www.youtube.com/embed/${encodeURIComponent(parts[0])}` : null;
    }

    if (host === 'twitch.tv') {
      if (parts[0] === 'videos' && parts[1]) {
        return `https://player.twitch.tv/?video=${encodeURIComponent(parts[1])}&parent=${pageHost}`;
      }

      return parts[0] ? `https://player.twitch.tv/?channel=${encodeURIComponent(parts[0])}&parent=${pageHost}` : null;
    }

    return null;
  } catch {
    return null;
  }
}
