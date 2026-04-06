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
            
            const urlParams = new URLSearchParams(window.location.search);
            
            if (dateVal) urlParams.set('date', dateVal);
            else urlParams.delete('date');
            
            if (timeVal) urlParams.set('time', timeVal);
            else urlParams.delete('time');
            
            // הדרך האגרסיבית והבטוחה לרענן: בניה מחדש של הכתובת המלאה
            // שורה חדשה עם פענוח הקידוד:
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
});