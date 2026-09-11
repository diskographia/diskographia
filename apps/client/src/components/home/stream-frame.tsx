'use client';

// строится только в браузере: twitch требует parent, а на сервере адреса нет
export function StreamFrame({ url, className }: { url: string; className?: string }) {
  const source = embedSource(url, window.location.hostname);

  if (!source) {
    return <div className="placeholder h-full w-full" />;
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

export function embedSource(url: string, pageHost: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === 'youtu.be') {
      return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
    }

    if (host === 'twitch.tv') {
      const channel = parsed.pathname.split('/').filter(Boolean)[0];
      return channel ? `https://player.twitch.tv/?channel=${channel}&parent=${pageHost}` : null;
    }

    return null;
  } catch {
    return null;
  }
}
