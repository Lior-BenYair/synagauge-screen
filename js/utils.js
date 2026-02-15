// js/utils.js

// פונקציית עזר לקריאת CSV
async function fetchCSV(url) {
    const cacheBuster = "&t=" + new Date().getTime(); 
    const res = await fetch(url + cacheBuster);
    const text = await res.text();
    
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        // 1. טיפול בגרשיים
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentCell += '"';
                i++; 
            } else {
                insideQuotes = !insideQuotes;
            }
        }
        // 2. טיפול בפסיק
        else if (char === ',' && !insideQuotes) {
            currentRow.push(currentCell);
            currentCell = '';
        }
        // 3. טיפול בירידת שורה
        else if ((char === '\r' || char === '\n') && !insideQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            if (currentRow.length > 0 || currentCell) {
                currentRow.push(currentCell);
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
        }
        // 4. תו רגיל
        else {
            currentCell += char;
        }
    }

    if (currentRow.length > 0 || currentCell) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }

    return rows.slice(1);
}

// פונקציה שמחזירה את התאריך הנוכחי - או את התאריך מה-URL
function getSystemDate() {
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date'); 
    
    if (dateParam) {
        return new Date(dateParam);
    }
    return new Date();
}