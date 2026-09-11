import { authHeaders } from '@/api/session';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

// токен в куке недоступен скриптам, поэтому браузер ходит через прослойку
async function forward(request: Request, path: string[]): Promise<Response> {
  const target = `${baseUrl}/${path.join('/')}${new URL(request.url).search}`;
  const contentType = request.headers.get('content-type');
  const hasBody = request.method !== 'GET' && request.method !== 'DELETE';

  try {
    const response = await fetch(target, {
      method: request.method,
      headers: {
        ...(await authHeaders()),
        ...(contentType ? { 'content-type': contentType } : {}),
      },
      body: hasBody ? request.body : undefined,
      duplex: 'half',
      cache: 'no-store',
    } as RequestInit & { duplex: 'half' });

    return new Response(response.body, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
    });
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
