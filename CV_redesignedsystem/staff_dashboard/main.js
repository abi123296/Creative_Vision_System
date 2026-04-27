/* 
  ========================================================
  LOGIC: Staff Dashboard Controller
  PURPOSE: Exact Admin Clock, Calc FIX, and Theme Synced.
  ======================================================== 
*/

function updateClock() {
    const hh = document.getElementById('hh');
    const mm = document.getElementById('mm');
    const ss = document.getElementById('ss');
    if(!hh || !mm || !ss) return;

    const now = new Date();
    let h = now.getHours();
    let m = now.getMinutes();
    let s = now.getSeconds();
    
    const ampmText = h >= 12 ? 'PM' : 'AM';
    h = h > 12 ? h - 12 : h; 
    h = h == 0 ? 12 : h; 

    document.getElementById('hours').innerText = (h < 10) ? '0'+h : h;
    document.getElementById('minutes').innerText = (m < 10) ? '0'+m : m;
    document.getElementById('seconds').innerText = (s < 10) ? '0'+s : s;
    document.getElementById('ampm').innerText = ampmText;

    hh.style.strokeDashoffset = 163 - (163 * h) / 12;
    mm.style.strokeDashoffset = 163 - (163 * m) / 60;
    ss.style.strokeDashoffset = 163 - (163 * s) / 60;

    const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
    document.getElementById("date-text").innerText = now.toLocaleDateString('en-GB', options);
}

setInterval(updateClock, 1000);

/**
 * THEME LOGIC
 */
function setTheme(mode) {
    const html = document.documentElement;
    const tracks = { light: document.getElementById('sw-light'), dark: document.getElementById('sw-dark'), auto: document.getElementById('sw-auto') };
    Object.values(tracks).forEach(t => { if(t) t.classList.remove('on'); });

    if (mode === 'light') { html.setAttribute('data-theme', 'light'); if(tracks.light) tracks.light.classList.add('on'); localStorage.setItem('cv_theme_preference', 'light'); } 
    else if (mode === 'dark') { html.setAttribute('data-theme', 'dark'); if(tracks.dark) tracks.dark.classList.add('on'); localStorage.setItem('cv_theme_preference', 'dark'); } 
    else if (mode === 'auto') { if(tracks.auto) tracks.auto.classList.add('on'); localStorage.setItem('cv_theme_preference', 'auto'); applyAutoTheme(); }
}

function applyAutoTheme() { const hour = new Date().getHours(); document.documentElement.setAttribute('data-theme', (hour >= 18 || hour < 6) ? 'dark' : 'light'); }

window.addEventListener('DOMContentLoaded', () => {
    setTheme(localStorage.getItem('cv_theme_preference') || 'dark');
    updateClock();
    
    // DUAL-PROTECTION MEMORY
    // 1. Try URL Hash first
    // 2. Try localStorage second
    // 3. Fallback to 'home'
    const hashModule = window.location.hash.replace('#', '');
    const lastModule = localStorage.getItem('cv_active_module');
    const initialModule = hashModule || lastModule || 'home';
    
    console.log("Persistence: Loading initial module ->", initialModule);
    loadModule(initialModule);
});

// Sync with browser Back/Forward buttons
window.addEventListener('hashchange', () => {
    const module = window.location.hash.replace('#', '');
    if (module) loadModule(module);
});

/**
 * GLOBAL ACCESS CONTROL: Helper to check if user has a permission string
 */
window.checkPermission = function(requiredPerm) {
    // 1. ADMISSIONS: Admins always have 100% access
    if (typeof USER_ROLE !== 'undefined' && USER_ROLE.toLowerCase() === 'admin') return true;

    if (typeof USER_PERMISSIONS === 'undefined') {
        console.warn("Security: USER_PERMISSIONS is undefined!");
        return true; 
    }
    const hasPerm = USER_PERMISSIONS.toLowerCase().includes(requiredPerm.toLowerCase());
    console.log(`Security Check: [${requiredPerm}] -> ${hasPerm ? 'ALLOWED' : 'DENIED'} (User Perms: "${USER_PERMISSIONS}")`);
    return hasPerm;
};

/**
 * MODULE NAVIGATION
 */
function loadModule(moduleName) {
    const contentBody = document.getElementById('main-content-area');
    if (!contentBody) return;
    
    // UI: Reset active sidebar link
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    const activeLi = document.querySelector(`.nav-links li[data-module="${moduleName}"]`);
    if (activeLi) activeLi.classList.add('active');

    // DUAL-SYNC: Update Hash and LocalStorage
    window.location.hash = moduleName;
    localStorage.setItem('cv_active_module', moduleName);

    let path = 'overview.html';
    if(moduleName === 'home') path = 'overview.html';
    if(moduleName === 'stocks') path = '../Stock_management/stock_management.html';
    if(moduleName === 'accessories') path = '../Acessories_dashboard/accessories.html';
    if(moduleName === 'reload') path = '../Reload_management/reload.html';
    if(moduleName === 'printer') path = '../Printer_management/printer.html';
    if(moduleName === 'attendance') path = '../Attendance_management/attendance.html';
    if(moduleName === 'credits') path = '../Credit_management/credits.html';
    if(moduleName === 'pos') path = '../POS_system/pos.html';

    // FORCE CACHE REFRESH USING TIMESTAMP
    fetch(path + '?t=' + new Date().getTime())
        .then(res => res.text())
        .then(html => { 
            const contentBody = document.getElementById('main-content-area');
            contentBody.innerHTML = html; 

            // Execute scripts in injected HTML
            const scripts = contentBody.querySelectorAll("script");
            scripts.forEach((oldScript) => {
                const newScript = document.createElement("script");
                if (oldScript.src) {
                    // Cache bust only local scripts, not CDNs
                    const rawSrc = oldScript.getAttribute("src");
                    const isLocal = rawSrc && !rawSrc.startsWith('http');
                    newScript.src = isLocal ? (oldScript.src + (oldScript.src.includes('?') ? '&' : '?') + 't=' + new Date().getTime()) : oldScript.src;
                } else {
                    newScript.textContent = oldScript.textContent;
                }
                document.head.appendChild(newScript).parentNode.removeChild(newScript);
            });

            // ALSO Cache-bust CSS links (if local)
            const links = contentBody.querySelectorAll("link[rel='stylesheet']");
            links.forEach(link => {
                const isLocal = !link.href.startsWith('http');
                if (isLocal) {
                    link.href = link.href.split('?')[0] + '?t=' + new Date().getTime();
                }
            });
        })
        .catch(err => { 
            console.error(err);
            document.getElementById('main-content-area').innerHTML = `<p style='padding:20px; color:red;'>Failed to load module: ${moduleName}</p>`; 
        });
}

/**
 * ACCOUNT DROPDOWN
 */
function toggleAccountMenu() {
    const dropdown = document.getElementById('acc-dropdown');
    if(dropdown) dropdown.classList.toggle('show');
}

window.addEventListener('click', (e) => {
    if (!e.target.closest('.account-control')) {
        const dropdown = document.getElementById('acc-dropdown');
        if (dropdown && dropdown.classList.contains('show')) dropdown.classList.remove('show');
    }
});

/**
 * CALCULATOR LOGIC
 */
let calcInput = "";
function toggleCalculator() { const calc = document.getElementById('floating-calc'); if(calc) calc.classList.toggle('show'); }
function insertCalc(val) { calcInput += val; updateCalcDisplay(); }
function clearCalc() { calcInput = ""; updateCalcDisplay(); }
function backspaceCalc() { calcInput = calcInput.slice(0, -1); updateCalcDisplay(); }
function calculate() { 
    if(!calcInput) return;
    try { 
        // Simple sanitization: only numbers and math operators
        const sanitized = calcInput.replace(/[^-()\d/*+.]/g, '');
        calcInput = String(Function('"use strict";return (' + sanitized + ')')()); 
        updateCalcDisplay(); 
    } catch(e) { 
        calcInput = "Error"; 
        updateCalcDisplay(); 
        setTimeout(() => clearCalc(), 1500); 
    } 
}
function updateCalcDisplay() { 
    const display = document.getElementById('calc-result'); 
    if(display) {
        display.innerText = calcInput || "0";
        display.scrollLeft = display.scrollWidth; // Auto scroll to end
    }
}

// Keyboard Support
window.addEventListener('keydown', (e) => {
    const calc = document.getElementById('floating-calc');
    if (!calc || !calc.classList.contains('show')) return;
    if (e.key >= '0' && e.key <= '9') insertCalc(e.key);
    if (['+', '-', '*', '/', '.'].includes(e.key)) insertCalc(e.key);
    if (e.key === 'Enter') calculate();
    if (e.key === 'Backspace') backspaceCalc();
    if (e.key === 'Escape') toggleCalculator();
});
