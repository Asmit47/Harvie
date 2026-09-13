import { auth } from '@clerk/nextjs/server';

const backendUrl = process.env.HARVIE_API_URL || 'http://localhost:8000';
const proxySecret = process.env.HARVIE_API_PROXY_SECRET;

async function forward(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ detail: 'Authentication required.' }, { status: 401 });
  }

  if (!proxySecret) {
    return Response.json(
      { detail: 'HARVIE_API_PROXY_SECRET is not configured.' },
      { status: 503 },
    );
  }

  const { path } = await context.params;
  const sourceUrl = new URL(request.url);
  const targetUrl = new URL(`${backendUrl.replace(/\/$/, '')}/${path.join('/')}`);
  targetUrl.search = sourceUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  headers.set('x-harvie-user-id', userId);
  headers.set('x-harvie-proxy-secret', proxySecret);

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
    cache: 'no-store',
  });

  return new Response(response.body, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
  });
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
