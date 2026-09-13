import { failureText } from './failure';

export interface Outcome<T = unknown> {
  ok: boolean;
  error: string | null;
  data: T | null;
}

// запрос из браузера: кука уходит сама, ответ разбирается в одно место
export async function request<T = unknown>(path: string, method = 'GET', body?: unknown): Promise<Outcome<T>> {
  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: 'сервер не отвечает', data: null };
  }

  if (!response.ok) {
    return { ok: false, error: await failureText(response), data: null };
  }

  const data = (await response.json().catch(() => null)) as T | null;

  return { ok: true, error: null, data };
}

export interface UploadHandle {
  done: Promise<Outcome>;
  abort: () => void;
}

// fetch не показывает ход загрузки, поэтому файл уходит через xhr
export function uploadFile(path: string, file: File, onProgress: (ratio: number) => void): UploadHandle {
  const xhr = new XMLHttpRequest();
  const body = new FormData();

  body.append('file', file);

  const done = new Promise<Outcome>((resolve) => {
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded / event.total);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true, error: null, data: null });
        return;
      }

      void failureText(new Response(xhr.responseText, { status: xhr.status })).then((error) =>
        resolve({ ok: false, error, data: null }),
      );
    });

    xhr.addEventListener('error', () => resolve({ ok: false, error: 'сервер не отвечает', data: null }));
    xhr.addEventListener('abort', () => resolve({ ok: false, error: 'загрузка отменена', data: null }));
  });

  xhr.open('POST', `/api${path}`);
  xhr.send(body);

  return { done, abort: () => xhr.abort() };
}
