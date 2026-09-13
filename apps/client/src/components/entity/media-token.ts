// ![[2]] ставит вторую прикреплённую медиа прямо в это место текста
const MEDIA_TOKEN = /!\[\[(\d+)\]\]/g;

export interface TextPiece {
  text: string;
  slot: number | null;
}

export function splitMediaTokens(source: string): TextPiece[] {
  const text = source.trim();
  const pieces: TextPiece[] = [];
  let cursor = 0;

  for (const match of text.matchAll(MEDIA_TOKEN)) {
    pieces.push({ text: text.slice(cursor, match.index), slot: Number(match[1]) - 1 });
    cursor = match.index + match[0].length;
  }

  pieces.push({ text: text.slice(cursor), slot: null });

  return pieces;
}

export function stripMediaTokens(source: string): string {
  return source.replace(MEDIA_TOKEN, '').trim();
}
