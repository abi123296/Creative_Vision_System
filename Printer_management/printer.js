// ============================================
// PRINTER MANAGEMENT UI SCRIPT - REDESIGNED
// ============================================

window.loadPrinters = function() {
    fetch('../Printer_management/printer_api.php?action=get')
        .then(r => r.json())
        .then(res => {
            if (res.status === 'success') {
                const grid = document.getElementById('printersGrid');
                if(!grid) return;
                grid.innerHTML = '';

                if (res.data.length === 0) {
                    grid.innerHTML = `<div style="text-align:center; grid-column: 1/-1; padding: 40px; color:rgba(255,255,255,0.5);">No printers detected in database.</div>`;
                    return;
                }

                res.data.forEach(p => {
                    grid.innerHTML += buildPrinterCard(p);
                });

                // Permission Guard: Force Lockdown
                if (typeof window.checkPermission === 'function' && !window.checkPermission('Printer Management')) {
                    const lock = () => {
                        document.querySelectorAll('.header-stats .primary-btn, .cbtn-group').forEach(el => el.style.display = 'none');
                    };
                    lock();
                    let count = 0;
                    const interval = setInterval(() => {
                        lock();
                        if (count++ > 10) clearInterval(interval);
                    }, 300);
                    console.log("Security: Printer Pulse Lock Active.");
                }
            }
        })
        .catch(err => {
            console.error("API Error or Missing API", err);
            // MOCK INJECTION IN CASE API IS MISSING
            window.mockPrinters();
        });
};

function buildPrinterCard(p) {
    let badgeClass = p.status === 'Active' ? 'stat-active' : 'stat-offline';
    let tonersHTML = '';
    
    if (p.is_color == 1 || p.is_color === true || p.is_color === "1") {
        tonersHTML += getTonerHTML('Cyan (C)', p.toner_cyan, 'cyan');
        tonersHTML += getTonerHTML('Magenta (M)', p.toner_magenta, 'magenta');
        tonersHTML += getTonerHTML('Yellow (Y)', p.toner_yellow, 'yellow');
    }
    tonersHTML += getTonerHTML('Black (K)', p.toner_black, 'black');

    let ipLabel = p.type || "Network Printer";
    if (p.ip_address) ipLabel += ' • IP: ' + p.ip_address;
    
    let formattedCounter = typeof p.print_counter !== "undefined" ? Number(p.print_counter).toLocaleString() : "0";
    let imgUrl = p.image_url ? p.image_url : '../assets/images/default_printer.png';

    return `
        <div class="balance-card glass-card printer-card">
            <div class="printer-img-wrapper">
                <img src="${imgUrl}" alt="${p.name}" class="printer-img" onerror="this.src='https://via.placeholder.com/300?text=PRINTER'">
                <span class="stat-badge float-badge ${badgeClass}">${p.status || 'Active'}</span>
            </div>
            
            <div class="printer-content">
                <div class="printer-header">
                    <div>
                        <h2 class="printer-name">${p.name}</h2>
                        <span class="printer-ip">${ipLabel}</span>
                    </div>
                </div>

                <div class="counter-box">
                    <span class="counter-lbl">Global Printing Counter:</span>
                    <h3 class="counter-val">${formattedCounter} <span class="sub-pages">pages</span></h3>
                </div>

                <div class="toner-container">
                    ${tonersHTML}
                </div>

                <div class="cbtn-group">
                    <button class="edit-action-btn edit-btn" style="flex:1;"
                        onclick="openEditPrinterModal(${p.id}, '${p.name}', ${p.print_counter}, ${p.is_color}, ${p.toner_black || 100}, ${p.toner_cyan || 100}, ${p.toner_magenta || 100}, ${p.toner_yellow || 100})">
                        <i class="fa-solid fa-gear" style="margin-right:4px;"></i> Status
                    </button>
                    <button class="edit-action-btn del-btn"
                        onclick="deletePrinter(${p.id})">
                        <i class="fa-solid fa-trash" style="margin-right:4px;"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getTonerHTML(label, amount, colorClass) {
    let html = `<div class="toner-row"><span>${label}</span><div class="toner-boxes">`;
    let fillCount = 0;
    let numAmount = parseInt(amount, 10);
    if (isNaN(numAmount)) numAmount = 0;

    if (numAmount >= 25) fillCount = 1;
    if (numAmount >= 50) fillCount = 2;
    if (numAmount >= 75) fillCount = 3;
    if (numAmount == 100) fillCount = 4;

    for (let i = 0; i < 4; i++) {
        if (i < fillCount) html += `<div class="t-box ${colorClass} fill"></div>`;
        else html += `<div class="t-box empty"></div>`;
    }
    html += `</div></div>`;
    return html;
}

window.mockPrinters = function() {
    const grid = document.getElementById('printersGrid');
    if(!grid || grid.innerHTML !== '') return;
    
    grid.innerHTML += buildPrinterCard({ id: 1, name: 'Canon G3000', print_counter: 15400, is_color: 1, toner_black: 25, toner_cyan: 75, toner_magenta: 50, toner_yellow: 100, type: 'Color Laser', ip_address: '192.168.1.12', image_url: 'https://via.placeholder.com/300x150?text=Canon+G3000', status: 'Active' });
    grid.innerHTML += buildPrinterCard({ id: 2, name: 'HP LaserJet Pro', print_counter: 82105, is_color: 0, toner_black: 100, type: 'Monochrome', ip_address: 'USB Local', image_url: 'https://via.placeholder.com/300x150?text=HP+LaserJet', status: 'Active' });
};

// Modals
window.openEditPrinterModal = function(id, name, pcount, isColor, bk, cy, mg, ye) {
    const modal = document.getElementById('printerModal');
    if(modal) modal.classList.add('show');
    
    document.getElementById('modalPrinterName').innerText = 'Update ' + name;
    document.getElementById('editPrinterId').value = id;
    document.getElementById('editIsColor').value = isColor;
    document.getElementById('printCounter').value = pcount;
    document.getElementById('tonerBlack').value = bk || 100;

    let colorGroups = document.querySelectorAll('.color-toner-group');
    if (isColor == 1 || isColor === true) {
        colorGroups.forEach(g => g.style.display = 'block');
        document.getElementById('tonerCyan').value = cy || 100;
        document.getElementById('tonerMagenta').value = mg || 100;
        document.getElementById('tonerYellow').value = ye || 100;
    } else {
        colorGroups.forEach(g => g.style.display = 'none');
    }
};

window.closeEditPrinterModal = function() {
    const modal = document.getElementById('printerModal');
    if(modal) modal.classList.remove('show');
};

window.saveStatus = function() {
    const id = document.getElementById('editPrinterId').value;
    const isColor = document.getElementById('editIsColor').value;
    const pcount = document.getElementById('printCounter').value;

    if (!pcount) { alert("Please enter the new printing counter amount!"); return; }

    let payload = {
        id: id,
        print_counter: pcount,
        toner_black: document.getElementById('tonerBlack').value
    };

    if (isColor == 1 || isColor === "true") {
        payload.toner_cyan = document.getElementById('tonerCyan').value;
        payload.toner_magenta = document.getElementById('tonerMagenta').value;
        payload.toner_yellow = document.getElementById('tonerYellow').value;
    }

    fetch('../Printer_management/printer_api.php?action=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(r => r.json()).then(res => {
        if(res.status === 'success') {
            window.closeEditPrinterModal();
            window.loadPrinters();
        } else alert(res.message);
    }).catch(err => {
        alert("Action failed. Server might be down.");
    });
};

window.openAddPrinterModal = function() {
    const modal = document.getElementById('addPrinterModal');
    if(modal) modal.classList.add('show');
    
    document.getElementById('addPrinterName').value = '';
    document.getElementById('addPrinterImage').value = '';
    document.getElementById('addPrintCounter').value = '';
    document.getElementById('addTonerLevel').value = '100';
    document.getElementById('addIsColor').value = '0';
};

window.closeAddPrinterModal = function() {
    const modal = document.getElementById('addPrinterModal');
    if(modal) modal.classList.remove('show');
};

window.saveNewPrinter = function() {
    const name = document.getElementById('addPrinterName').value;
    const fileInput = document.getElementById('addPrinterImage');
    const count = document.getElementById('addPrintCounter').value;
    const toner = document.getElementById('addTonerLevel').value;
    const isColor = document.getElementById('addIsColor').value;

    if (name && count) {
        let formData = new FormData();
        formData.append('name', name);
        formData.append('print_counter', count);
        formData.append('toner_level', toner);
        formData.append('is_color', isColor == '1' ? 1 : 0);

        if (fileInput.files.length > 0) {
            formData.append('printer_image', fileInput.files[0]);
        }

        fetch('../Printer_management/printer_api.php?action=add', {
            method: 'POST',
            body: formData
        }).then(r => r.json()).then(res => {
            if(res.status === 'success') {
                window.closeAddPrinterModal();
                window.loadPrinters();
            } else alert(res.message);
        }).catch(err => alert("Failed to add printer to database."));
    } else {
        alert('Please enter a printer name and initial print counter!');
    }
};

window.deletePrinter = function(id) {
    if (confirm("Are you sure you want to permanently remove this printer?")) {
        fetch('../Printer_management/printer_api.php?action=delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        }).then(r => r.json()).then(res => {
            if(res.status === 'success') window.loadPrinters();
            else alert(res.message);
        }).catch(err => alert('Failed to delete printer.'));
    }
};

// Initialize
if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.loadPrinters);
} else {
    window.loadPrinters();
}
