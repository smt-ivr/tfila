import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
    async fetch(request, env, ctx) {
        try {
            // הפונקציה מושכת ומגישה את הקבצים מתוך תיקיית ה-bucket שהגדרנו (public)
            return await getAssetFromKV(
                {
                    request,
                    waitUntil: ctx.waitUntil.bind(ctx),
                },
                {
                    ASSET_NAMESPACE: env.__STATIC_CONTENT,
                    ASSET_MANIFEST: JSON.parse(env.__STATIC_CONTENT_MANIFEST),
                }
            );
        } catch (e) {
            // במידה והנתיב לא קיים (שגיאת 404), נחזיר הודעה מתאימה
            return new Response('העמוד לא נמצא', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        }
    },
};
