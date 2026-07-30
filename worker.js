import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
    async fetch(request, env, ctx) {
        try {
            let url = new URL(request.url);
            
            // אם המשתמש נכנס לנתיב הספציפי, נגיש לו את הקבצים מהתיקייה הראשית
            if (url.pathname.startsWith('/tfila')) {
                url.pathname = url.pathname.replace('/tfila', '/');
            }
            
            const modifiedRequest = new Request(url.toString(), request);

            return await getAssetFromKV(
                {
                    request: modifiedRequest,
                    waitUntil: ctx.waitUntil.bind(ctx),
                },
                {
                    ASSET_NAMESPACE: env.__STATIC_CONTENT,
                    ASSET_MANIFEST: JSON.parse(env.__STATIC_CONTENT_MANIFEST),
                }
            );
        } catch (e) {
            return new Response('העמוד לא נמצא', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        }
    },
};
