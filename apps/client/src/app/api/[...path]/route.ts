import { API_URL } from '@/api/urls';

// в разработке caddy нет и браузер ходит в api через next: прослойка проносит куку туда и продлённую куку обратно.
// в бою caddy отдаёт /api сразу серверу, и тот читает и ставит куку сам
async function forward(request: Request, path: string[]): Promise<Response> {
  const target = `${API_URL}/${path.join('/')}${new URL(request.url).search}`;
  const contentType = request.headers.get('content-type');
  const cookie = request.headers.get('cookie');
  const hasBody = request.method !== 'GET' && request.method !== 'DELETE';

  try {
    const response = await fetch(target, {
      method: request.method,
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(contentType ? { 'content-type': contentType } : {}),
      },
      body: hasBody ? request.body : undefined,
      duplex: 'half',
      cache: 'no-store',
    } as RequestInit & { duplex: 'half' });

    const headers = new Headers({ 'content-type': response.headers.get('content-type') ?? 'application/json' });

    for (const value of response.headers.getSetCookie()) {
      headers.append('set-cookie', value);
    }

    return new Response(response.body, { status: response.status, headers });
  } catch {
    return Response.json({ message: 'сервер не отвечает' }, { status: 502 });
  }
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  return forward(request, (await context.params).path);
}

export async function POST(request: Request, context: Context): Promise<Response> {
  return forward(request, (await context.params).path);
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  return forward(request, (await context.params).path);
}

export async function PUT(request: Request, context: Context): Promise<Response> {
  return forward(request, (await context.params).path);
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  return forward(request, (await context.params).path);
}
