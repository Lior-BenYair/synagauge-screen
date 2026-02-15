// js/app.js

// ==========================================
// הגדרות
// ==========================================
const READERS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRpQmb6-3vOGGYVVkQWQpHbGr5hp7NwRmDgwAw7b8zwoB5Tk3MJrVZReEet5CfcNSTTUBlIUq2ASOUd/pub?gid=0&single=true&output=csv';
const NEWS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRpQmb6-3vOGGYVVkQWQpHbGr5hp7NwRmDgwAw7b8zwoB5Tk3MJrVZReEet5CfcNSTTUBlIUq2ASOUd/pub?gid=1737085330&single=true&output=csv';
const SLIDE_DURATION = 10000; 
const REFRESH_INTERVAL = 5 * 60 * 1000; 
// ==========================================

let slides = []; 
let currentSlideIndex = 0;
let scrollInterval = null;
let lastFetchTime = 0;
let slideTimer = null;

// js/app.js

function loadTheme() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // אם יש פרמטר ב-URL, נשתמש בו. אחרת - נלך על modern.
    const themeName = urlParams.get('theme') || 'modern'; 
    
    const themeLink = document.getElementById('theme-link');
    if (themeLink) {
        themeLink.href = `css/themes/${themeName}.css`;
        // console.log(`Theme loaded: ${themeName}`); // אופציונלי לניפוי באגים
    }
}

async function buildDynamicSlides() {
    const frame = document.getElementById('main-frame');
    
    // מחיקת שקופיות ישנות
    const existingDynamic = document.querySelectorAll('.dynamic-slide');
    existingDynamic.forEach(el => el.remove());

    // --- טעינת רשימות ---
    try {
        const listData = await fetchCSV(READERS_CSV_URL);
        
        if (listData.length > 0) {
            let slidesContent = [];
            let currentSlide = { title: "קוראים בתורה", items: [], duration: SLIDE_DURATION }; 
            let isNextLineTitle = false;

            listData.forEach(row => {
                const col1 = row[0] ? row[0].trim() : '';
                const col2 = row[1] ? row[1].trim() : '';
                
                if (!col1 && !col2) return;

                if (col1.includes('*****')) {
                    if (currentSlide.items.length > 0) slidesContent.push(currentSlide);
                    currentSlide = { title: "", items: [], duration: SLIDE_DURATION };
                    isNextLineTitle = true;
                } 
                else if (isNextLineTitle) {
                    currentSlide.title = col1;
                    const seconds = parseInt(col2);
                    if (!isNaN(seconds) && seconds > 0) {
                        currentSlide.duration = seconds * 1000;
                    }
                    isNextLineTitle = false;
                } 
                else if (col1.startsWith('^')){
                    // ignore
                }
                else {
                    currentSlide.items.push({ role: col1, name: col2 });
                }
            });

            if (currentSlide.items.length > 0) slidesContent.push(currentSlide);

            slidesContent.forEach(slide => {
                const div = document.createElement('div');
                div.className = 'slide dynamic-slide';
                div.setAttribute('data-duration', slide.duration);
                
                let html = `<h1>${slide.title}</h1><div class="content-box"><ul>`;
                slide.items.forEach(item => {
                    html += `<li><span class="role">${item.role}</span><span>${item.name}</span></li>`;
                });
                html += `</ul></div>`;
                div.innerHTML = html;
                frame.insertBefore(div, document.getElementById('progress'));
            });
        }
    } catch (e) { console.error("Error Lists:", e); }

    // --- טעינת חדשות ---
    try {
        const newsData = await fetchCSV(NEWS_CSV_URL);
        
        if (newsData.length > 0) {
            let slidesContent = [];
            let currentSlide = { title: "הודעות הקהילה", items: [], duration: SLIDE_DURATION };
            let isNextLineTitle = false;

            newsData.forEach(row => {
                const text = row[0] ? row[0].trim() : '';
                const timeVal = row[1] ? row[1].trim() : '';

                if (!text) return;

                if (text.includes('*****')) {
                    if (currentSlide.items.length > 0 || currentSlide.title !== "הודעות הקהילה") {
                        slidesContent.push(currentSlide);
                    }
                    currentSlide = { title: "", items: [], duration: SLIDE_DURATION };
                    isNextLineTitle = true;
                } 
                else if (isNextLineTitle) {
                    currentSlide.title = text;
                    const seconds = parseInt(timeVal);
                    if (!isNaN(seconds) && seconds > 0) {
                        currentSlide.duration = seconds * 1000;
                    }
                    isNextLineTitle = false;
                }  
                else if (text.startsWith('^')){
                    // ignore
                }
                else {
                    if (text.startsWith('IMG:')) {
                        const imgUrl = text.replace('IMG:', '').trim();
                        currentSlide.items.push({ type: 'image', value: imgUrl });
                    } else {
                        currentSlide.items.push({ type: 'text', value: text });
                    }
                }
            });

            if (currentSlide.items.length > 0) slidesContent.push(currentSlide);

            slidesContent.forEach(slide => {
                const div = document.createElement('div');
                div.className = 'slide dynamic-slide';
                div.setAttribute('data-duration', slide.duration);
                
                let html = `<h1>${slide.title}</h1><div class="content-box"><ul>`;
                slide.items.forEach(item => {
                    if (item.type === 'image') {
                        html += `<img src="${item.value}" class="slide-image" alt="תמונה">`;
                    } else {
                        html += `<li>${item.value}</li>`;
                    }
                });
                html += `</ul></div>`;
                div.innerHTML = html;
                frame.insertBefore(div, document.getElementById('progress'));
            });
        }
    } catch (e) { console.error("Error News:", e); }
    
    slides = document.querySelectorAll('.slide');
}

async function loadShabbatTimes() {
    try {
        // --- הגדרות בסיס ---
        const now = getSystemDate();
        const gy = now.getFullYear();
        const gm = String(now.getMonth() + 1).padStart(2, '0'); 
        const gd = String(now.getDate()).padStart(2, '0');
        const todayDateISO = gy + "-" + gm + "-" + gd;

        const baseUrl = `https://www.hebcal.com/shabbat?cfg=json&geonameid=6693679&M=on&lg=he&o=on`;
        const dateParams = `&gy=${gy}&gm=${gm}&gd=${gd}`; 
        
        const response = await fetch(baseUrl + dateParams); 
        const data = await response.json();

        // 1. מיון
        data.items.sort((a, b) => new Date(a.date) - new Date(b.date));


        // =================================================================
        // שלב 2: בחירת הכותרת הראשית (הקדמנו את השלב הזה!)
        // =================================================================
        
        // סינון מועמדים לכותרת
        const titleCandidates = data.items.filter(item => {
            const itemDate = item.date.substring(0, 10);
            if (itemDate < todayDateISO) return false;

            const isParasha = item.category === "parashat";
            const isMajorHoliday = item.category === "holiday" && item.subcat === "major";
            const isCholHamoedShabbat = item.category === "holiday" && item.hebrew.includes("חול המועד") && item.subcat === "shabbat";

            return isParasha || isMajorHoliday || isCholHamoedShabbat;
        });

        // בחירת האירוע הראשי בפועל
        let mainItem = null;
        let titleText = "ברוכים הבאים";
        let isMainTitleParasha = false; // <--- המשתנה החשוב החדש שלך
        let isMajorHoliday = false;

        if (titleCandidates.length > 0) {
            mainItem = titleCandidates[0];
            titleText = mainItem.hebrew;
            
            // בדיקה האם הכותרת היא פרשה
            isMainTitleParasha = (mainItem.category === "parashat");
            
            // בדיקה האם זה חג גדול (לצורך שינוי נרות/הבדלה)
            isMajorHoliday = (mainItem.category === "holiday" && mainItem.subcat === "major");

            // תיקוני טקסט
            // תיקון טקסט ל"שבת חול המועד" - בדיקה גמישה שתופסת את כל סוגי הגרשיים
            if (titleText.includes("פסח") && (titleText.includes("חוה") || titleText.includes("חול המועד"))) {
                titleText = "שבת חול המועד פסח";
            }
            if (titleText.includes("סוכות") && (titleText.includes("חוה") || titleText.includes("חול המועד"))) {
                titleText = "שבת חול המועד סוכות";
            }
        }

        // עדכון התצוגה של הכותרת
        document.getElementById('parasha-name').innerText = titleText;
        
        if (isMajorHoliday) {
            document.getElementById('label-candles').innerText = "כניסת החג:";
            document.getElementById('label-havdalah').innerText = "יציאת החג:";
        } else {
            document.getElementById('label-candles').innerText = "כניסת שבת:";
            document.getElementById('label-havdalah').innerText = "יציאת שבת:";
        }


        // =================================================================
        // שלב 3: בניית רשימת התוספות (Special Events)
        // =================================================================
        
        let specialAdditions = [];

        // א. שבתות מיוחדות ומברכים
        data.items.forEach(item => {
            const itemDate = item.date.substring(0, 10);
            if (itemDate < todayDateISO) return;

            // בדיקת מברכים (תמיד מציגים)
            if (item.category === "mevarchim") {
                specialAdditions.push(item.hebrew);
            }

            // בדיקת שבת מיוחדת (שקלים, שובה וכו')
            if (item.category === "holiday" && item.subcat === "shabbat" && !item.hebrew.includes("חול המועד")) {
                
                // --- התיקון שלך: ---
                // מוסיפים שבת מיוחדת *רק* אם הכותרת הראשית היא פרשה רגילה.
                // אם הכותרת היא חג (כמו ראש השנה), לא נוסיף "שבת שובה".
                if (isMainTitleParasha) {
                    specialAdditions.push(item.hebrew);
                }
            }
        });


        // ב. אירועים של היום (ספירת העומר, ראש חודש...)
        data.items.forEach(item => {
             const itemDate = item.date.substring(0, 10);
             if (itemDate === todayDateISO) {
                
                if (item.category === "omer") specialAdditions.push(item.hebrew);
                if (item.category === "roshchodesh") specialAdditions.push(item.hebrew);
                
                // חגים קטנים
                if (item.category === "holiday" && 
                    item.subcat !== "major" && 
                    item.subcat !== "shabbat" &&
                    item !== mainItem) { // לוודא שזה לא הכותרת עצמה
                    
                    if (!specialAdditions.includes(item.hebrew)) {
                        specialAdditions.push(item.hebrew);
                    }
                }
             }
        });

        // =================================================================
        // שלב 4: הצגת התוספות
        // =================================================================
        const uniqueSpecialEvents = [...new Set(specialAdditions)];
        document.getElementById('special-day-text').innerText = uniqueSpecialEvents.join(" | ");


        // =================================================================
        // שלב 5: תאריך וזמנים (כרגיל)
        // =================================================================
        try {
            const dateRes = await fetch(`https://www.hebcal.com/converter?cfg=json&date=${todayDateISO}&g2h=1&strict=1`);
            const dateData = await dateRes.json();
            const cleanDate = dateData.hebrew.replace(/[\u0591-\u05C7]/g, ''); 
            const dayName = new Intl.DateTimeFormat('he-IL', { weekday: 'long' }).format(now);
            document.getElementById('hebrew-date-display').innerText = `${dayName}, ${cleanDate}`;
        } catch (err) { console.log("Date error"); }

        const candles = data.items.find(i => i.category === "candles");
        const havdalah = data.items.find(i => i.category === "havdalah");

        if(candles) {
            const d = new Date(candles.date);
            document.getElementById('candles-time').innerText = d.toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'});
        }
        if(havdalah) {
            const d = new Date(havdalah.date);
            document.getElementById('havdalah-time').innerText = d.toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'});
        }

        const zmanimUrl = `https://www.hebcal.com/zmanim?cfg=json&geonameid=6693679&date=${todayDateISO}`;
        const zmanimRes = await fetch(zmanimUrl);
        const zmanimData = await zmanimRes.json();

        if (zmanimData.times) {
            const formatTime = (iso) => new Date(iso).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'});
            const sofZmanGra = formatTime(zmanimData.times.sofZmanShma);
            const sofZmanMga = formatTime(zmanimData.times.sofZmanShmaMGA);
            
            const footerEl = document.getElementById('footer-text');
            if (footerEl) {
                 footerEl.innerHTML = `סוף זמן קריאת שמע (גר"א): <span style="color:var(--accent-color)">${sofZmanGra}</span> &nbsp;|&nbsp; (מג"א): <span style="color:var(--accent-color)">${sofZmanMga}</span>`;
            }
        }

    } catch(e) { console.log("Hebcal error", e); }
}


function startAutoScroll(slideElement, duration) {
    const box = slideElement.querySelector('.content-box');
    if (box) box.scrollTop = 0;
    if (!box || box.scrollHeight <= box.clientHeight) return;

    const startDelay = 2000; 
    const endDelay = 3000;
    const totalDistance = box.scrollHeight - box.clientHeight;
    let availableTime = Math.max(duration - startDelay - endDelay, 1000);
    const minSpeedPixelsPerSecond = 25; 
    const timeNeededForMinSpeed = (totalDistance / minSpeedPixelsPerSecond) * 1000;
    const finalScrollTime = Math.min(availableTime, timeNeededForMinSpeed);

    let startTime = null;
    let startScrollTop = box.scrollTop;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / finalScrollTime, 1);
        box.scrollTop = startScrollTop + (totalDistance * progress);

        if (progress < 1 && slideElement.classList.contains('active')) {
            window.requestAnimationFrame(step);
        }
    }

    setTimeout(() => {
        if (slideElement.classList.contains('active')) {
            window.requestAnimationFrame(step);
        }
    }, startDelay);
}

async function showSlide(index) {
    if (slideTimer) clearTimeout(slideTimer);
    if (scrollInterval) clearInterval(scrollInterval);

    const now = new Date().getTime();
    if (index === 0 && (now - lastFetchTime > REFRESH_INTERVAL)) {
        console.log("Refreshing data...");
        await buildDynamicSlides();
        await loadShabbatTimes();
        lastFetchTime = now;
        slides = document.querySelectorAll('.slide');
    }

    if (index >= slides.length) index = 0;
    currentSlideIndex = index;

    slides.forEach(s => s.classList.remove('active'));
    const currentSlideEl = slides[currentSlideIndex];
    currentSlideEl.classList.add('active');

    let duration = parseInt(currentSlideEl.getAttribute('data-duration'));
    if (!duration || isNaN(duration)) duration = SLIDE_DURATION;

    startAutoScroll(currentSlideEl, duration);

    const bar = document.getElementById('progress');
    bar.style.transition = 'none';
    bar.style.width = '0%';
    setTimeout(() => {
        bar.style.transition = `width ${duration}ms linear`; 
        bar.style.width = '100%';
    }, 50);

    slideTimer = setTimeout(nextSlide, duration);
}

function nextSlide() {
    let nextIndex = (currentSlideIndex + 1) % slides.length;
    showSlide(nextIndex);
}

function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('he-IL', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    const clockEl = document.getElementById('digital-clock');
    if (clockEl) clockEl.innerText = timeString;
}

    // התחלת שעון
    updateClock();
    setInterval(updateClock, 1000);

// --- אתחול ראשוני ---
async function init() {
    loadTheme(); // טעינת ערכת נושא
    await loadShabbatTimes();
    await buildDynamicSlides();
    document.getElementById('loader').style.display = 'none';
    lastFetchTime = new Date().getTime();

    slides = document.querySelectorAll('.slide');
    


    // התחלת המצגת
    showSlide(0); 
    
    // רענון מלא כל 4 שעות
    setTimeout(() => location.reload(), 14400000); 
}

init();