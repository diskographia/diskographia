// ascii-логотип стоит вместо содержимого, пока экран не наполнился
export function AsciiWait({ note = 'загружается' }: { note?: string }) {
  return (
    <div className="ascii-wait">
      <img src="/decor/ascii-logo.webp" alt="" />
      <span>{note}</span>
    </div>
  );
}

// ascii-декор лежит фоном у сообщений
export function AsciiNote({ kind = 1, children }: { kind?: 1 | 2; children: React.ReactNode }) {
  return (
    <div className="ascii-note" style={{ backgroundImage: `url(/decor/ascii-${kind}.webp)` }}>
      <span>{children}</span>
    </div>
  );
}
