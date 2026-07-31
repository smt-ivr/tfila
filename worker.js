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

        // ניתוב לקובץ הראשי - כולל תמיכה בנתיב השורש ובנתיב /tfila
        if (path === '/' || path === '/tfila' || path === '/tfila/' || path === '/index.html' || path === '/tfila/index.html') {
            return new Response(htmlContent, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
        
        // ניתוב לקובץ העיצוב
        if (path === '/style.css' || path === '/tfila/style.css') {
            return new Response(cssContent, { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
        }
        
        // ניתוב לקובצי ה-JavaScript
        if (path === '/app.js' || path === '/tfila/app.js' || path === '/client-app.js' || path === '/tfila/client-app.js') {
            return new Response(appJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/reports.js' || path === '/tfila/reports.js' || path === '/client-reports.js' || path === '/tfila/client-reports.js') {
            return new Response(reportsJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/students.js' || path === '/tfila/students.js' || path === '/client-students.js' || path === '/tfila/client-students.js') {
            return new Response(studentsJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/vacations.js' || path === '/tfila/vacations.js' || path === '/client-vacations.js' || path === '/tfila/client-vacations.js') {
            return new Response(vacationsJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }

        // שגיאת 404 אם הקובץ לא נמצא
        return new Response('Not Found', { status: 404 });
    }
};
