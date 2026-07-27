// Adds baseline security headers to every response.
export async function onRequest(context) {
  const res = await context.next();
  const h = new Headers(res.headers);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "same-origin");
  h.set("X-Frame-Options", "SAMEORIGIN");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
