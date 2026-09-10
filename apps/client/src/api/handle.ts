// next отдаёт @ то как есть, то закодированным
export function parseHandle(segment: string): string | null {
  const decoded = decodeURIComponent(segment);

  return decoded.startsWith('@') ? decoded.slice(1) : null;
}
