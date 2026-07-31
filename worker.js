import htmlContent from './index.html';
import cssContent from './style.css';
import appJs from './client-app.js';
import reportsJs from './client-reports.js';
import studentsJs from './client-students.js';
import vacationsJs from './client-vacations.js';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // ניתוב לקובץ הראשי
        if (path === '/' || path === '/index.html') {
            return new Response(htmlContent, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
        
        // ניתוב לקובץ העיצוב
        if (path === '/style.css') {
            return new Response(cssContent, { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
        }
        
        // ניתוב לקובצי ה-JavaScript
        // שים לב: הדפדפן עדיין יבקש את הקבצים בשם המקורי שלהם, אבל נגיש לו את הקבצים החדשים שייבאנו
        if (path === '/app.js') {
            return new Response(appJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/reports.js') {
            return new Response(reportsJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/students.js') {
            return new Response(studentsJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/vacations.js') {
            return new Response(vacationsJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }

        // שגיאת 404 אם הקובץ לא נמצא
        return new Response('Not Found', { status: 404 });
    }
};
