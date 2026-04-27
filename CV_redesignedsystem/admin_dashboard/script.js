/* 
  ========================================================
  FILE: script.js
  PURPOSE: Managing Amazing Circular Clock and the new
           MINI SLIDING Switches.
  ======================================================== 
*/

function updateClock() {
    const hh = document.getElementById('hh');
    const mm = document.getElementById('mm');
    const ss = document.getElementById('ss');
    
    const now = new Date();
    let h = now.getHours();
    let m = now.getMinutes();
    let s = now.getSeconds();
    
    // AM/PM calculation
    const ampmText = h >= 12 ? 'PM' : 'AM';
    h = h > 12 ? h - 12 : h; 
    h = h == 0 ? 12 : h; 

    // Update Text numbers
    document.getElementById('hours').innerHTML = (h < 10) ? '0'+h : h;
    document.getElementById('minutes').innerHTML = (m < 10) ? '0'+m : m;
    document.getElementById('seconds').innerHTML = (s < 10) ? '0'+s : s;
    document.getElementById('ampm').innerHTML = ampmText;

    // Radius is 26, circumference is 2 * PI * 26 ≈ 163
    hh.style.strokeDashoffset = 163 - (163 * h) / 12;
    mm.style.strokeDashoffset = 163 - (163 * m) / 60;
    ss.style.strokeDashoffset = 163 - (163 * s) / 60;

    const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
    document.getElementById("date-text").innerText = now.toLocaleDateString('en-GB', options);
}

setInterval(updateClock, 1000);
updateClock();
 
 /**
  * GLOBAL ACCESS CONTROL: Helper to check if user has a permission string
  */
 window.checkPermission = function(requiredPerm) {
     // Admin Dashboard always has all permissions
     if (typeof USER_PERMISSIONS === 'undefined') return true; 
     return true; 
 };



/**
 * MINI PILL SWITCH LOGIC
 */
function setTheme(mode) {
    const html = document.documentElement;
    const tracks = {
        light: document.getElementById('sw-light'),
        dark: document.getElementById('sw-dark'),
        auto: document.getElementById('sw-auto')
    };

    // 1. Reset all tracks
    Object.values(tracks).forEach(t => t.classList.remove('on'));

    // 2. Clear auto-timer
    if (window.autoThemeInterval) clearInterval(window.autoThemeInterval);

    if (mode === 'light') {
        html.setAttribute('data-theme', 'light');
        tracks.light.classList.add('on');
        localStorage.setItem('cv_theme_preference', 'light');
    } 
    else if (mode === 'dark') {
        html.setAttribute('data-theme', 'dark');
        tracks.dark.classList.add('on');
        localStorage.setItem('cv_theme_preference', 'dark');
    } 
    else if (mode === 'auto') {
        tracks.auto.classList.add('on');
        localStorage.setItem('cv_theme_preference', 'auto');
        applyAutoTheme();
        window.autoThemeInterval = setInterval(applyAutoTheme, 60000);
    }
}

function applyAutoTheme() {
    const hour = new Date().getHours();
    const html = document.documentElement;
    if (hour >= 18 || hour < 6) {
        html.setAttribute('data-theme', 'dark');
    } else {
        html.setAttribute('data-theme', 'light');
    }
}

// ON LOAD
window.addEventListener('DOMContentLoaded', () => {
    const pref = localStorage.getItem('cv_theme_preference') || 'dark';
    setTheme(pref);

    // Initial Load - Check what module we were on
    const activeModule = localStorage.getItem('cv_current_module') || 'home';
    
    if (activeModule === 'home') {
        // Just show current page (which is home by default)
        const activeLi = document.querySelector(`.nav-links li[data-module="home"]`);
        if (activeLi) activeLi.classList.add('active');
    } else {
        loadModule(activeModule);
    }
});

/**
 * MODULE NAVIGATION & LOADING
 * This refreshes ONLY the body content of the dashboard.
 */
function loadModule(moduleName) {
    const contentBody = document.querySelector('.dashboard-body');
    if (!contentBody) return;

    // 1. Update active state in sidebar
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    const activeLi = document.querySelector(`.nav-links li[data-module="${moduleName}"]`);
    if (activeLi) activeLi.classList.add('active');

    // 2. Clear old module-specific resources
    const oldResources = document.querySelectorAll('.module-resource');
    oldResources.forEach(res => res.remove());

    // 3. Handle HOME specifically (Don't fetch, just reload container or redirect)
    if (moduleName === 'home') {
        localStorage.setItem('cv_current_module', 'home');
        window.location.href = 'index.php'; // This takes us back to the clean dashboard
        return;
    }

    // 4. Determine path for target module
    let path = '';
    let cssPath = '';
    let jsPath = '';

    if (moduleName === 'staff') {
        path = '../staff_management/view_staff.html';
        cssPath = '../staff_management/style.css';
        jsPath = '../staff_management/staff_controller.js';
    } else if (moduleName === 'stocks') {
        path = '../Stock_management/stock_management.html';
        cssPath = '../Stock_management/stock_management.css';
        jsPath = '../Stock_management/stock_management.js';
    } else if (moduleName === 'accessories') {
        path = '../Acessories_dashboard/accessories.html';
        cssPath = '../Stock_management/stock_management.css';
        jsPath = '../Acessories_dashboard/accessories.js';
    } else if (moduleName === 'reload') {
        path = '../Reload_management/reload.html';
        cssPath = '../Reload_management/reload.css';
        jsPath = '../Reload_management/reload.js';
    } else if (moduleName === 'printer') {
        path = '../Printer_management/printer.html';
        cssPath = '../Printer_management/printer.css';
        jsPath = '../Printer_management/printer.js';
    } else if (moduleName === 'attendance') {
        path = '../Attendance_management/attendance.html';
        cssPath = '../Attendance_management/attendance.css';
        jsPath = '../Attendance_management/attendance.js';
    }

    if (path) {
        // Show loading shimmer
        contentBody.innerHTML = `
            <div class="module-loading">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <p>Loading ${moduleName.toUpperCase()} Module...</p>
            </div>`;

        fetch(path + '?t=' + new Date().getTime())
            .then(res => {
                if(!res.ok) throw new Error("Module file not found");
                return res.text();
            })
            .then(html => {
                 // INJECT HTML
                 contentBody.innerHTML = html;
                 localStorage.setItem('cv_current_module', moduleName);
 
                 // INJECT CSS with Cache Busting
                 if (cssPath) {
                     const link = document.createElement('link');
                     link.rel = 'stylesheet';
                     link.href = cssPath + '?t=' + new Date().getTime();
                     link.classList.add('module-resource');
                     document.head.appendChild(link);
                 }
 
                 // INJECT JS with Cache Busting
                 if (jsPath) {
                     const script = document.createElement('script');
                     script.src = jsPath + '?t=' + new Date().getTime();
                     script.classList.add('module-resource');
                     document.body.appendChild(script);
                 }
 
                 // Process any scripts inside the fetched HTML
                 const innerScripts = contentBody.querySelectorAll("script");
                 innerScripts.forEach(oldScript => {
                     const newScript = document.createElement("script");
                     if (oldScript.src) {
                         const rawSrc = oldScript.getAttribute("src");
                         const isLocal = rawSrc && !rawSrc.startsWith('http');
                         newScript.src = isLocal ? (oldScript.src + (oldScript.src.includes('?') ? '&' : '?') + 't=' + new Date().getTime()) : oldScript.src;
                     } else {
                         newScript.textContent = oldScript.textContent;
                     }
                     document.head.appendChild(newScript).parentNode.removeChild(newScript);
                 });
            })
            .catch(err => {
                contentBody.innerHTML = `
                    <div class="module-error">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <h3>Module Load Error</h3>
                        <p>Could not find the ${moduleName} files at ${path}</p>
                    </div>`;
                console.error(err);
            });
    }
}
