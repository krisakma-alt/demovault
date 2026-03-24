export async function onRequest(context) {
  const response = await context.next();
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none');
  return newResponse;
}
