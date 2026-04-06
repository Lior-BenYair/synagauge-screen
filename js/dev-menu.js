document.addEventListener('DOMContentLoaded', () => {
    
    // האזנה למקלדת (האות D)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'd' || e.key === 'D' || e.key === 'ד') {
            const devMenu = document.getElementById('dev-menu');
            
            if (devMenu.style.display === 'none') {
                devMenu.style.display = 'block';
                
                // מילוי התיבות בנתונים הנוכחיים מתוך שורת הכתובת
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('date')) document.getElementById('dev-date').value = urlParams.get('date');
                if (urlParams.get('time')) document.getElementById('dev-time').value = urlParams.get('time');
                
                // מילוי שדה המהירות
                if (urlParams.get('speed')) {
                    document.getElementById('dev-speed').value = urlParams.get('speed');
                } else {
                    document.getElementById('dev-speed').value = ''; // ניקוי במקרה שאין פרמטר
                }

            } else {
                devMenu.style.display = 'none';
            }
        }
    });

    // כפתור החל ורענן
    const btnApply = document.getElementById('dev-apply');
    if (btnApply) {
        btnApply.addEventListener('click', () => {
            const dateVal = document.getElementById('dev-date').value;
            const timeVal = document.getElementById('dev-time').value;
            const speedVal = document.getElementById('dev-speed').value;
            
            const urlParams = new URLSearchParams(window.location.search);
            
            // עדכון תאריך
            if (dateVal) urlParams.set('date', dateVal);
            else urlParams.delete('date');
            
            // עדכון שעה
            if (timeVal) urlParams.set('time', timeVal);
            else urlParams.delete('time');

            // עדכון מהירות
            if (speedVal) urlParams.set('speed', speedVal);
            else urlParams.delete('speed');
            
            // רענון בטוח עם קידוד תקין כדי שהשעה תישאר יפה ב-URL
            const newUrl = window.location.pathname + '?' + decodeURIComponent(urlParams.toString());
            window.location.href = newUrl;
        });
    }

    // כפתור סגירה
    const btnClose = document.getElementById('dev-close');
    if (btnClose) {
        btnClose.addEventListener('click', () => {
            document.getElementById('dev-menu').style.display = 'none';
        });
    }

// --- חיבור כפתורי הבדיקה לאזעקות (קוראים לפונקציות מ-app.js) ---

    const btnTriggerAlarm = document.getElementById('dev-trigger-alarm');
    if (btnTriggerAlarm) {
        btnTriggerAlarm.addEventListener('click', () => {
            // מפעיל את הפונקציה הגלובלית שנמצאת ב-app.js
            if (typeof showAlarmOverlay === 'function') {
                showAlarmOverlay('ירי רקטות וטילים', 'מודיעין - מכבים - רעות', 'red', true);
            } else {
                console.error("showAlarmOverlay function not found in app.js");
            }
        });
    }

    const btnStopAlarm = document.getElementById('dev-stop-alarm');
    if (btnStopAlarm) {
        btnStopAlarm.addEventListener('click', () => {
            if (typeof hideAlarmOverlay === 'function') {
                hideAlarmOverlay();
            }
        });
    }
});