// js/app.js

// ==========================================
// הגדרות
// ==========================================
const LISTS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRpQmb6-3vOGGYVVkQWQpHbGr5hp7NwRmDgwAw7b8zwoB5Tk3MJrVZReEet5CfcNSTTUBlIUq2ASOUd/pub?gid=0&single=true&output=csv';
const NEWS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRpQmb6-3vOGGYVVkQWQpHbGr5hp7NwRmDgwAw7b8zwoB5Tk3MJrVZReEet5CfcNSTTUBlIUq2ASOUd/pub?gid=1737085330&single=true&output=csv';
const SLIDE_DURATION = 10000; 
const REFRESH_INTERVAL = 5 * 60 * 1000; 
const PURIM_THEMES = ['modern', 'dark', 'classic', 'gold', 'light'];
// ==========================================

// קריאת מכפיל המהירות מה-URL
const urlParams = new URLSearchParams(window.location.search);
// אם כתוב ?speed=2 אז המהירות פי 2 (הזמן נחלק ב-2). ברירת מחדל: 1.
const SPEED_FACTOR = parseFloat(urlParams.get('speed')) || 1;

let slides = []; 
let currentSlideIndex = 0;
let scrollInterval = null;
let lastFetchTime = 0;
let slideTimer = null;

// --- תוספות לפורים ---
let cycleCount = 0;       // סופר כמה סיבובים עשתה המצגת
let isPurimMode = false;  // האם להפעיל את השיגעון

// js/app.js

function loadTheme() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // אם יש פרמטר ב-URL, נשתמש בו. אחרת - נלך על modern.
    const themeName = urlParams.get('theme') || 'modern'; 
    
    const themeLink = document.getElementById('theme-link');
    if (themeLink) {
        themeLink.href = `css/themes/${themeName}.css`;
    }
}

async function buildDynamicSlides() {
    const frame = document.getElementById('main-frame');
    
    // מחיקת שקופיות ישנות
    const existingDynamic = document.querySelectorAll('.dynamic-slide');
    existingDynamic.forEach(el => el.remove());

    // --- טעינת רשימות ---
    try {
        const listData = await fetchCSV(LISTS_CSV_URL);
        
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
                    // this is a real line with role and name.
                    // if the name is missing, we can skip it.
                    if (!col2) return;
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
        const now = getSystemDate(); 
        const getISO = (d) => d.toISOString().split('T')[0];
        
        // --- מערכת סימולציית שעות ---
        const urlParams = new URLSearchParams(window.location.search);
        const timeParam = urlParams.get('time'); 
        if (timeParam) {
            const [hours, minutes] = timeParam.split(':');
            now.setHours(parseInt(hours, 10), parseInt(minutes || 0, 10), 0);
            console.log(`⏱️ Simulation Mode: Time forced to ${timeParam}`);
        }
        
        // --- שלב 1: בדיקת שקיעה ---
        const initialZmanimUrl = `https://www.hebcal.com/zmanim?cfg=json&geonameid=6693679&date=${getISO(now)}`;
        const initialZmanimRes = await fetch(initialZmanimUrl);
        const initialZmanimData = await initialZmanimRes.json();
        
        const sunset = new Date(initialZmanimData.times.sunset);
        let targetDate = new Date(now);

        const isAfterSunset = now > sunset;
        if (isAfterSunset) {
            targetDate.setDate(now.getDate() + 1);
            console.log("After sunset: Switching to tomorrow's data...");
        }
        
        const todayISO = getISO(targetDate);

        // --- שלב 1.5: קריאת זמני היום האפקטיבי (הוקדם כדי שישמש את שעות הצום) ---
        let zmanimToDisplay = initialZmanimData;
        if (isAfterSunset) {
            const finalZmanimRes = await fetch(`https://www.hebcal.com/zmanim?cfg=json&geonameid=6693679&date=${todayISO}`);
            zmanimToDisplay = await finalZmanimRes.json();
        }

        // --- שלב 2: קריאה מאוחדת ל-API ---
        const fetchStart = new Date(targetDate);
        fetchStart.setDate(fetchStart.getDate() - 3); 
        const fetchEnd = new Date(targetDate);
        fetchEnd.setDate(fetchEnd.getDate() + 9); 

        const hebcalUrl = `https://www.hebcal.com/hebcal?v=1&cfg=json&geonameid=6693679&lg=he&s=on&maj=on&min=on&nx=on&ss=on&mod=on&mf=on&o=on&M=on&m=50&c=on&b=18&start=${getISO(fetchStart)}&end=${getISO(fetchEnd)}`;
        const hebcalRes = await fetch(hebcalUrl);
        const hebcalData = await hebcalRes.json();

        // --- שלב 3: המרת תאריך עברי ---
        const convUrl = `https://www.hebcal.com/converter?cfg=json&date=${todayISO}&g2h=1&strict=1`;
        const convRes = await fetch(convUrl);
        const convData = await convRes.json();

        // --- עיבוד נתונים ---
        const cleanHebDate = convData.hebrew.replace(/[\u0591-\u05C7]/g, '');
        const dayName = new Intl.DateTimeFormat('he-IL', { weekday: 'long' }).format(targetDate);
        document.getElementById('hebrew-date-display').innerText = `${dayName}, ${cleanHebDate}`;

        // == סינון כותרת ראשית ==
        const titleCandidates = hebcalData.items.filter(item => {
            const itemDate = item.date.substring(0, 10);
            if (itemDate < todayISO) return false; 

            const isParasha = item.category === "parashat";
            const isCholHamoedText = item.hebrew.includes("חול המועד") || item.hebrew.includes("חוה");
            const isMajorHoliday = item.category === "holiday" && item.subcat === "major" && !isCholHamoedText;
            const isCholHamoedShabbat = item.category === "holiday" && item.subcat === "shabbat" && isCholHamoedText;
            
            return isParasha || isMajorHoliday || isCholHamoedShabbat;
        });

        let titleText = "ברוכים הבאים";
        let mainItem = null;
        if (titleCandidates.length > 0) {
            mainItem = titleCandidates[0];
            titleText = mainItem.hebrew;

            const normalizedTitle = titleText.replace(/[׳`´]/g, "'");
            const corrections = {
                "פסח ז'": "שביעי של פסח",
                "פסח ח'": "אחרון של פסח",
                "סוכות א'": "חג הסוכות",
                "שבועות א'": "חג השבועות",
                "פסח א'": "חג הפסח"
            };
            
            if (corrections[normalizedTitle]) {
                titleText = corrections[normalizedTitle];
            } else if (mainItem.subcat === "shabbat") {
                const isCholHamoedText = titleText.includes("חול המועד") || titleText.includes("חוה");
                if (titleText.includes("פסח") && isCholHamoedText) {
                    titleText = "שבת חול המועד פסח";
                }
                if (titleText.includes("סוכות") && isCholHamoedText) {
                    titleText = "שבת חול המועד סוכות";
                }
            }
        }

        // remove the word "פרשת" if it exists and the title is too long
        if (titleText.startsWith("פרשת") && titleText.length > 10) {
            titleText = titleText.replace("פרשת", "").trim();
        }
        document.getElementById('parasha-name').innerText = titleText;

        // == פס צהוב (אירועי היום וזיהוי צום) ==
        let specialAdditions = [];
        const mainItemDateISO = mainItem ? mainItem.date.substring(0, 10) : null;
        let isMinorFastToday = false;

        hebcalData.items.forEach(item => {
            const itemDate = item.date.substring(0, 10);
            const isCholHamoedText = item.hebrew.includes("חול המועד") || item.hebrew.includes("חוה");
            
            if (itemDate === todayISO) {
                // בדיקת צום (למעט תשעה באב שמתחיל בערב)
                if (item.category === "holiday" && item.subcat === "fast" && !item.hebrew.includes("באב")) {
                    isMinorFastToday = true;
                }

                if (item.category === "omer") {
                    specialAdditions.push(`${item.title} (${dayName})`);
                }
                if (item.category === "roshchodesh") specialAdditions.push(item.hebrew);
                if (item.category === "holiday" && (!mainItem || mainItem.hebrew !== item.hebrew)) specialAdditions.push(item.hebrew);
            }
            
            if (itemDate >= todayISO) {
                if (item.category === "mevarchim") {
                    if (mainItemDateISO && itemDate <= mainItemDateISO) specialAdditions.push(item.hebrew);
                }
                if (item.category === "holiday" && item.subcat === "shabbat" && mainItem?.category === "parashat" && !isCholHamoedText) {
                    specialAdditions.push(item.hebrew);
                }
            }
        });
        document.getElementById('special-day-text').innerText = [...new Set(specialAdditions)].join(" | ");

        // == מציאת נרות והבדלה ותוויות חכמות ==
        let candles = null;
        let havdalah = null;
        let labelCandles = "כניסת שבת:";
        let labelHavdalah = "יציאת שבת:";

        if (mainItem) {
            const mainDateStr = mainItem.date.substring(0, 10);
            
            const pastOrPresentCandles = hebcalData.items.filter(i => i.category === "candles" && i.date.substring(0, 10) <= mainDateStr);
            if (pastOrPresentCandles.length > 0) {
                candles = pastOrPresentCandles[pastOrPresentCandles.length - 1];
            }

            const futureOrPresentHavdalah = hebcalData.items.filter(i => i.category === "havdalah" && i.date.substring(0, 10) >= mainDateStr);
            if (futureOrPresentHavdalah.length > 0) {
                havdalah = futureOrPresentHavdalah[0];
            }

            const isMajorHoliday = mainItem.category === "holiday" && mainItem.subcat === "major";
            
            if (candles) {
                const cDate = new Date(candles.date);
                if (cDate.getDay() !== 5 || isMajorHoliday) labelCandles = "כניסת החג:";
                else labelCandles = "כניסת שבת:";
            }

            if (havdalah) {
                const hDate = new Date(havdalah.date);
                if (hDate.getDay() === 6) labelHavdalah = "יציאת שבת:";
                else labelHavdalah = "יציאת החג:";
            }
        }

        // --- הדרסת התוויות עבור צום קטן ---
        if (isMinorFastToday && zmanimToDisplay && zmanimToDisplay.times) {
            const isFriday = targetDate.getDay() === 5;
            
            if (isFriday) {
                // מקרה קצה (עשרה בטבת בשישי): צד ימין תחילת צום, צד שמאל כניסת שבת
                const originalCandles = candles; 
                labelCandles = "תחילת הצום:";
                candles = { date: zmanimToDisplay.times.alotHaShachar };
                
                if (originalCandles) {
                    labelHavdalah = "כניסת שבת:";
                    havdalah = originalCandles;
                }
            } else {
                // יום חול רגיל: כניסת צום וצאת צום
                labelCandles = "תחילת הצום:";
                candles = { date: zmanimToDisplay.times.alotHaShachar };
                
                labelHavdalah = "צאת הצום:";
                havdalah = { date: zmanimToDisplay.times.tzeit85deg }; // צאת הכוכבים המאוחר
            }
        }
        
        document.getElementById('label-candles').innerText = labelCandles;
        document.getElementById('label-havdalah').innerText = labelHavdalah;

        if (candles) document.getElementById('candles-time').innerText = new Date(candles.date).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'});
        if (havdalah) document.getElementById('havdalah-time').innerText = new Date(havdalah.date).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'});

        // == זמני קריאת שמע ==
        const formatZman = (iso) => new Date(iso).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'});
        const footerEl = document.getElementById('footer-text');
        if (footerEl && zmanimToDisplay.times) {
            footerEl.innerHTML = `סוף זמן קריאת שמע (גר"א): <span style="color:var(--accent-color)">${formatZman(zmanimToDisplay.times.sofZmanShma)}</span> &nbsp;|&nbsp; (מג"א): <span style="color:var(--accent-color)">${formatZman(zmanimToDisplay.times.sofZmanShmaMGA)}</span>`;
        }

        const titleCheck = document.getElementById('parasha-name').innerText;
        const specialCheck = document.getElementById('special-day-text').innerText;
        if (specialCheck.includes("שבת זכור") || titleCheck.includes("פורים") || specialCheck.includes("פורים")) {
            isPurimMode = true;
        }

    } catch(e) { console.error("Optimization Error:", e); }
}


function startAutoScroll(slideElement, duration) {
    const box = slideElement.querySelector('.content-box');
    if (box) box.scrollTop = 0;
    if (!box || box.scrollHeight <= box.clientHeight) return;

    // כאן התיקון: חילוק הזמנים בפקטור המהירות
    // אם SPEED_FACTOR לא מוגדר (למשל לא הועתק), נשתמש ב-1 כברירת מחדל
    const factor = (typeof SPEED_FACTOR !== 'undefined') ? SPEED_FACTOR : 1;

    const startDelay = 2000 / factor; // המתנה לפני גלילה (מותאמת מהירות)
    const endDelay = 3000 / factor;   // המתנה בסוף גלילה (מותאמת מהירות)

    const totalDistance = box.scrollHeight - box.clientHeight;
    
    // חישוב הזמן שנשאר לגלילה נטו
    let availableTime = Math.max(duration - startDelay - endDelay, 1000 / factor);
    
    // הגדרת מהירות מינימלית (פיקסלים לשנייה) - גם אותה נאיץ אם צריך
    const minSpeedPixelsPerSecond = 25 * factor; 
    
    const timeNeededForMinSpeed = (totalDistance / minSpeedPixelsPerSecond) * 1000;
    
    // בוחרים את הזמן הקצר מבין השניים (כדי לא לגלול לאט מדי)
    // אבל מוודאים שלא חורגים מהזמן הפנוי בשקופית
    const finalScrollTime = Math.min(availableTime, timeNeededForMinSpeed);

    let startTime = null;
    let startScrollTop = box.scrollTop;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        
        // חישוב ההתקדמות (בין 0 ל-1)
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

    // --- בדיקת גלישה (סוף מצגת) ---
    if (index >= slides.length) {
        index = 0; // חזרה להתחלה
        
        // --- לוגיקת פורים ---
        if (isPurimMode) {
            cycleCount++;
            
            // 1. החלפת Theme (קורה בכל סיבוב!)
            // בוחרים theme אקראי מתוך הרשימה שהגדרנו למעלה
            const randomTheme = PURIM_THEMES[Math.floor(Math.random() * PURIM_THEMES.length)];
            const themeLink = document.getElementById('theme-link');
            if (themeLink) {
                themeLink.href = `css/themes/${randomTheme}.css`;
                console.log(`Purim Theme Swapped: ${randomTheme}`);
            }

            // 2. אפקטים משוגעים (קורה רק בסיבובים אי-זוגיים)
            // קודם כל מנקים אפקטים קודמים
            document.body.classList.remove('purim-mirror', 'purim-upside', 'purim-invert', 'purim-drunk');

            if (cycleCount % 2 !== 0) {
                const effects = ['purim-mirror', 'purim-upside', 'purim-invert', 'purim-drunk'];
                const randomEffect = effects[Math.floor(Math.random() * effects.length)];
                document.body.classList.add(randomEffect);
            }
        }
        // ---------------------
    }

    currentSlideIndex = index;

    // ... (שאר הפונקציה נשאר אותו דבר בדיוק) ...
    slides.forEach(s => s.classList.remove('active'));
    const currentSlideEl = slides[currentSlideIndex];
    currentSlideEl.classList.add('active');

    let rawDuration = parseInt(currentSlideEl.getAttribute('data-duration'));
    if (!rawDuration || isNaN(rawDuration)) rawDuration = SLIDE_DURATION;

    // חישוב המהירות (Speed Factor)
    // הערה: וודא ש-SPEED_FACTOR מוגדר למעלה בקובץ, אם לא - תגדיר אותו כ-1
    const factor = (typeof SPEED_FACTOR !== 'undefined') ? SPEED_FACTOR : 1;
    let duration = rawDuration / factor;

    startAutoScroll(currentSlideEl, duration);

    const bar = document.getElementById('progress');
    if (bar) {
        bar.style.transition = 'none';
        bar.style.width = '0%';
        void bar.offsetWidth; 
        setTimeout(() => {
            bar.style.transition = `width ${duration}ms linear`; 
            bar.style.width = '100%';
        }, 50);
    }

    slideTimer = setTimeout(nextSlide, duration);
}

function nextSlide() {
    // מוחקים את החישוב עם ה-% (מודולו)
    // פשוט שולחים את האינדקס הבא, ונותנים ל-showSlide לטפל בחזרה להתחלה
    showSlide(currentSlideIndex + 1);
}

function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('he-IL', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
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

    // --- מנגנון רענון לילי חסין-הירדמות (פועם כל דקה) ---
    setInterval(() => {
        const now = new Date();
        // בודק אם השעה היא בדיוק 03:00 (ובין 0 ל-59 שניות)
        if (now.getHours() === 3 && now.getMinutes() === 0) {
            console.log("Nightly refresh triggered!");
            window.location.reload(true);
        }
    }, 60000); // רץ כל 60,000 מילישניות (דקה אחת)
}

init();

// ==========================================
// מערכת התראות פיקוד העורף - סנכרון מלא
// ==========================================

const ALARM_ZONES = ["מודיעין - מכבים - רעות"];
const PROXY_URL = "https://oref-proxy.benyair-lior.workers.dev/"; // <--- ודא שהכתובת שלך כאן

let isAlarmActive = false;

async function fetchOrefAlerts() {
    try {
        const response = await fetch(PROXY_URL);
        if (!response.ok) return;

        const text = await response.text();
        
        // בדיקה אם יש בכלל נתונים (קובץ ריק = אין אזעקות בארץ)
        const hasData = text && text.trim() !== "" && text.trim() !== "{}";
        let activeInOurZone = false;
        let alertCategory = 'התרעת פיקוד העורף';

        if (hasData) {
            try {
                const alertData = JSON.parse(text);
                if (alertData && alertData.data) {
                    // בודק אם מודיעין מופיעה ברשימה
                    activeInOurZone = alertData.data.some(zone => ALARM_ZONES.includes(zone));
                    alertCategory = alertData.title || alertCategory;
                }
            } catch (e) {
                console.error("JSON Parse Error");
            }
        }

        // לוגיקת הצגה/הסתרה אוטומטית
        if (activeInOurZone && !isAlarmActive) {
            // האזעקה התחילה במודיעין - מקפיצים סרגל
            showAlarmOverlay(alertCategory, ALARM_ZONES[0], 'red', false);
            isAlarmActive = true;
        } 
        else if (!activeInOurZone && isAlarmActive) {
            // האזעקה הסתיימה או הוסרה משרתי פיקוד העורף - מורידים סרגל
            hideAlarmOverlay();
            isAlarmActive = false;
        }

    } catch (error) {
        // במקרה של שגיאת רשת, לא עושים כלום כדי לא להפריע למצגת
        console.log("Fetch failed, retrying in next cycle...");
    }
}

// הפונקציות לתצוגה (ודא שהן קיימות ב-app.js או utils.js)
function showAlarmOverlay(title, zone, severity, isTest) {
    const banner = document.getElementById('alarm-banner');
    if (!banner) return;
    
    document.getElementById('alarm-title').innerText = title;
    document.getElementById('alarm-zones').innerText = zone;
    document.getElementById('alarm-test-badge').style.display = isTest ? 'block' : 'none';
    
    banner.style.transform = 'translateY(0)';
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.style.transform = 'scale(0.75)';
        mainContent.style.transformOrigin = 'top center';
    }
}

function hideAlarmOverlay() {
    const banner = document.getElementById('alarm-banner');
    if (!banner) return;
    
    banner.style.transform = 'translateY(100%)';
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.style.transform = 'scale(1)';
    }
}

// התחלת דגימה רציפה כל 3 שניות
setInterval(fetchOrefAlerts, 3000);