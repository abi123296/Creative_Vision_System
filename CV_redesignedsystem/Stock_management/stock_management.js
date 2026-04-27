/**
 * CLEAN LOGIC: Stock Management (Dual UI: Inline Add + Popup Edit)
 * Author: Antigravity AI
 * Location: Stock_management/stock_management.js
 */

window.initStockModule = function() {
    const canManage = window.checkPermission('stocks');
    
    const addSection = document.getElementById('stock-form-section');
    const addBtn = document.getElementById('toggle-add-stock-section');
    const closeAddBtn = document.getElementById('close-form-section');
    const cancelAddBtn = document.getElementById('cancel-stock-form');
    const editModal = document.getElementById('edit-modal');
    const closeEditBtn = document.getElementById('close-edit-modal');
    const cancelEditBtn = document.getElementById('cancel-edit-modal');

    // HIDE ADD BUTTON IF NOT AUTHORIZED
    if (addBtn) {
        if (canManage) {
            addBtn.onclick = () => toggleAddForm(true);
        } else {
            addBtn.style.display = 'none'; // Only authorized users see 'Add'
        }
    }

    // TOGGLES
    const toggleAddForm = (show) => {
        if(addSection) addSection.classList.toggle('show', show);
        if(show) addSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if(!show) {
            const addForm = document.getElementById('stock-form');
            if(addForm) { addForm.reset(); const b = addForm.querySelector('input[name="category"][value="Books"]'); if(b) b.checked = true; }
        }
    };
    const toggleEditModal = (show) => { if(editModal) editModal.classList.toggle('show', show); };

    // HANDLERS
    if(closeAddBtn) closeAddBtn.onclick = () => toggleAddForm(false);
    if(cancelAddBtn) cancelAddBtn.onclick = () => toggleAddForm(false);
    if(closeEditBtn) closeEditBtn.onclick = () => toggleEditModal(false);
    if(cancelEditBtn) cancelEditBtn.onclick = () => toggleEditModal(false);

    // SUBMIT (ADD)
    const addForm = document.getElementById('stock-form');
    if(addForm) {
        addForm.onsubmit = (e) => {
            e.preventDefault();
            if(!window.checkPermission('stocks')) { alert("Access Denied: You cannot perform this action."); return; }
            fetch('../Stock_management/stock_backend.php', { method: 'POST', body: new FormData(addForm) })
            .then(res => res.json()).then(res => { if(res.status === 'success') { toggleAddForm(false); window.fetchStocks(); } else { alert(res.message); } });
        };
    }

    // SUBMIT (EDIT)
    const editForm = document.getElementById('edit-stock-form');
    if(editForm) {
        editForm.onsubmit = (e) => {
            e.preventDefault();
            if(!window.checkPermission('stocks')) { alert("Access Denied: You cannot perform this action."); return; }
            fetch('../Stock_management/stock_backend.php', { method: 'POST', body: new FormData(editForm) })
            .then(res => res.json()).then(res => { if(res.status === 'success') { toggleEditModal(false); window.fetchStocks(); } else { alert(res.message); } });
        };
    }

    // EXPORT HANDLERS
    const exportModal = document.getElementById('export-modal');
    const openExportBtn = document.getElementById('open-export-menu');
    const closeExportBtn = document.getElementById('close-export-modal');
    if(openExportBtn) openExportBtn.onclick = () => { if(exportModal) exportModal.classList.add('show'); };
    if(closeExportBtn) closeExportBtn.onclick = () => { if(exportModal) exportModal.classList.remove('show'); };

    window.fetchStocks();
};

/**
 * GENERATE PROFESSIONAL STOCK REPORT (PDF/PRINT)
 */
window.generateStockReport = function(mode) {
    const data = window.allStocks;
    if(!data || data.length === 0) { alert("No data to export!"); return; }

    const reportContainer = document.getElementById('hidden-report-template');
    reportContainer.style.display = 'block';

    // 1. CALCULATE SUMMARY
    let totalInvValue = 0;
    let totalRetailValue = 0;
    let lowStockItems = [];
    const categoryCounts = {};

    data.forEach(item => {
        const bal = parseFloat(item.stock_balance);
        totalInvValue += (parseFloat(item.buy_price) * bal);
        totalRetailValue += (parseFloat(item.sell_price) * bal);
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        if(bal <= (parseInt(item.alert_limit) || 10)) lowStockItems.push(item);
    });

    const now = new Date();
    const dateTimeStr = now.toLocaleDateString() + " at " + now.toLocaleTimeString();

    // 2. CONSTRUCT REPORT HTML (Steel-Frame Hybrid Geometry)
    let reportHTML = `
        <div style="background: #fff; width: 190mm; margin: 0; padding: 0; box-sizing: border-box; color: #000; font-family: 'Outfit', sans-serif;">
            <!-- DOUBLE BORDER BOX EFFECT (Fixed Safe Calibration) -->
            <div style="border: 1.5pt solid #000; padding: 1mm; box-sizing: border-box; min-height: 258mm;">
                <div style="border: 0.5pt solid #000; padding: 10mm; height: 100%; min-height: 255mm; box-sizing: border-box; position: relative; background: #fff;">
                    
                    <!-- HEADER -->
                    <div style="position: relative; margin-bottom: 8mm; min-height: 25mm; text-align: center;">
                        <img src="../assets/images/Untitled%20design.png" style="position: absolute; left: 0; top: 0; width: 22mm;">
                        <div style="display: inline-block;">
                            <h1 style="margin: 0; color: #1e3a8a; font-size: 26pt; letter-spacing: 2px; font-weight: 900;">CREATIVE VISION</h1>
                            <p style="margin: 2mm 0; font-weight: 700; font-size: 10pt; color: #444; text-transform: uppercase;">Communication Shop & General Suppliers</p>
                            <div style="height: 0.5mm; width: 20mm; background: #3b82f6; margin: 3mm auto;"></div>
                            <p style="margin: 1mm 0; font-size: 9.5pt;">Galle Road 79, Dehiwala, Colombo, Western 03</p>
                            <p style="margin: 1mm 0; font-size: 9.5pt; font-weight: 800; color: #2563eb;">Phone: +94 77-230-2233</p>
                        </div>
                    </div>

                    <div style="border-top: 2pt double #1e3a8a; margin-bottom: 10mm;"></div>

                    <div style="text-align: center; margin-bottom: 12mm;">
                        <h2 style="text-transform: uppercase; margin-bottom: 2mm; font-size: 16pt; color: #000; text-decoration: underline;">Stock Inventory Status Report</h2>
                        <p style="font-style: italic; color: #666; font-size: 9pt;">Report Date: ${dateTimeStr}</p>
                    </div>

                    <!-- SUMMARY -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin-bottom: 10mm;">
                        <div style="background: #f8fafc; padding: 5mm; border: 0.5pt solid #000; border-left: 4mm solid #1e3a8a;">
                            <h3 style="margin-top: 0; font-size: 12pt; color: #1e3a8a;">Financial Summary</h3>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 2mm;"><span>Total Items:</span> <b>${data.length}</b></div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 2mm;"><span>Inv. Cost:</span> <b>Rs. ${totalInvValue.toLocaleString()}</b></div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 2mm;"><span>Retail Value:</span> <b>Rs. ${totalRetailValue.toLocaleString()}</b></div>
                            <div style="display: flex; justify-content: space-between; padding-top: 2mm; border-top: 0.5pt solid #000;"><span>Estimated Profit:</span> <b>Rs. ${(totalRetailValue - totalInvValue).toLocaleString()}</b></div>
                        </div>
                        <div style="background: #fffafa; padding: 5mm; border: 0.5pt solid #000; border-left: 4mm solid #ef4444;">
                            <h3 style="margin-top: 0; font-size: 12pt; color: #991b1b;">Operational Health</h3>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 2mm;"><span>Healthy:</span> <b>${data.length - lowStockItems.length}</b></div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 2mm; color: #dc2626;"><span>Critical:</span> <b>${lowStockItems.length}</b></div>
                            <div style="margin-top: 4mm; font-size: 8pt; color: #000; padding: 2mm; background: #fee2e2; font-weight: 800; text-align: center;">
                                ${lowStockItems.length > 0 ? "ACTION REQ: RESTOCK" : "STOCK STATUS: GOOD"}
                            </div>
                        </div>
                    </div>

                    <!-- CHART -->
                    <div style="text-align:center; margin-bottom: 10mm; padding: 5mm; border: 0.5pt solid #000; background: #fff;">
                        <h3 style="margin-bottom: 5mm; font-size: 11pt; text-transform: uppercase;">Stock Level Analytics</h3>
                        <div style="display: flex; justify-content: center;">
                            <canvas id="reportChart" width="500" height="170"></canvas>
                        </div>
                    </div>

                    <!-- INSIGHTS -->
                     <div style="padding: 5mm; border: 0.5pt solid #000; background: #fffbeb; border-left: 4mm solid #f59e0b;">
                        <h3 style="margin-top: 0; color: #92400e; font-size: 12pt;">Strategic Intelligence</h3>
                        <ul style="padding-left: 6mm; margin: 0; color: #000; font-size: 9.5pt; line-height: 1.5;">
                            ${lowStockItems.length > 0 ? 
                                lowStockItems.slice(0, 3).map(i => `<li><b>${i.product_name}</b>: Critical balance (${i.stock_balance}). Order 25+ units.</li>`).join('')
                                : "<li>All inventory points are currently above safety thresholds.</li>"}
                            <li>Priority: Monitor high-demand Stationaries for seasonal shifts.</li>
                        </ul>
                    </div>

                    <!-- FOOTER (Internal Box Bottom) -->
                    <div style="position: absolute; bottom: 5mm; left: 10mm; right: 10mm; border-top: 1pt solid #000; padding-top: 3mm; text-align: center; font-size: 8pt; color: #000;">
                        <p>© ${new Date().getFullYear()} Creative Vision Shop. Galle Road 79, Dehiwala. Confidential Document.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    reportContainer.innerHTML = reportHTML;

    // 3. RENDER CHART
    setTimeout(() => {
        const ctx = document.getElementById('reportChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(categoryCounts),
                datasets: [{
                    label: 'Count',
                    data: Object.values(categoryCounts),
                    backgroundColor: ['#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
                    borderColor: '#000',
                    borderWidth: 1
                }]
            },
            options: { 
                responsive: false, 
                animation: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { color: '#000', font: { weight: 'bold' } } }, 
                    x: { grid: { display: false }, ticks: { color: '#000', font: { weight: 'bold' } } } 
                }
            }
        });

        // 4. PDF ENGINE
        const opt = {
            margin: [0, 0, 0, 0], 
            filename: 'Creative_Vision_Stock_Report.pdf',
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { scale: 3, useCORS: true, letterRendering: true, width: 794 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        if(mode === 'save') {
           html2pdf().set(opt).from(reportContainer).save().then(() => { 
                reportContainer.style.display = 'none'; 
                document.getElementById('export-modal').classList.remove('show');
            });
        } else {
            html2pdf().set(opt).from(reportContainer).toPdf().get('pdf').then(pdf => {
                window.open(pdf.output('bloburl'), '_blank').print();
                reportContainer.style.display = 'none';
                document.getElementById('export-modal').classList.remove('show');
            });
        }
    }, 250);
};

window.allStocks = [];

window.fetchStocks = function() {
    fetch('../Stock_management/stock_backend.php?action=fetch_stocks')
        .then(res => res.json()).then(res => {
            if(res.status === 'success') {
                window.allStocks = res.data;
                window.renderStockTable(window.allStocks);
                window.updateStats(window.allStocks);
            }
    });
};

window.renderStockTable = function(data) {
    const tbody = document.getElementById('stock-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    const canManage = window.checkPermission('stocks');

    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px; color: #94a3b8;">No inventory found.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const isLow = parseInt(item.stock_balance) <= (parseInt(item.alert_limit) || 10);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><div class="product-info"><span class="p-name">${item.product_name}</span></div></td>
            <td><span class="badge" style="background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:5px; font-size:0.75rem;">${item.category}</span></td>
            <td><span class="mono">${item.shortcut_name || '-'}</span></td>
            <td>Rs. ${parseFloat(item.buy_price).toFixed(2)}</td>
            <td>Rs. ${parseFloat(item.sell_price).toFixed(2)}</td>
            <td><span class="stock-bal ${isLow ? 'low-stock' : ''}">${item.stock_balance}</span></td>
            <td>
                <div class="action-btns">
                    ${canManage ? `
                    <button class="btn-edit" onclick="window.editStock(${item.id})"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-delete" onclick="window.deleteStock(${item.id})"><i class="fa-solid fa-trash"></i></button>` 
                    : `<span style="font-size:0.7rem; opacity:0.5;">No Permit</span>`}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.updateStats = function(data) {
    const total = data.length;
    const low = data.filter(i => parseInt(i.stock_balance) <= (parseInt(i.alert_limit) || 10)).length;
    if(document.getElementById('total-items-badge')) document.getElementById('total-items-badge').innerText = total;
    if(document.getElementById('low-stock-badge')) document.getElementById('low-stock-badge').innerText = low;
    if(document.querySelector('.item-count')) document.querySelector('.item-count').innerText = `Total items: ${total}`;
};

window.filterByCategory = function(category) {
    document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
    const activePill = document.querySelector(`.filter-pill[data-category="${category}"]`);
    if (activePill) activePill.classList.add('active');
    window.renderStockTable((category === 'all') ? window.allStocks : window.allStocks.filter(s => s.category === category));
};

window.filterStocksBySearch = function() {
    const q = document.getElementById('stock-search').value.toLowerCase();
    window.renderStockTable(window.allStocks.filter(s => s.product_name.toLowerCase().includes(q) || (s.shortcut_name && s.shortcut_name.toLowerCase().includes(q))));
};

window.editStock = function(id) {
    const item = window.allStocks.find(s => s.id == id);
    if(!item) return;
    document.getElementById('edit-stock-id').value = item.id;
    document.getElementById('edit-p-name').value = item.product_name;
    document.getElementById('edit-p-short').value = item.shortcut_name;
    document.getElementsByName('category').forEach(radio => { if(radio.value === item.category) radio.checked = true; });
    document.getElementById('edit-p-bal').value = item.stock_balance;
    document.getElementById('edit-p-alert').value = item.alert_limit || 10;
    document.getElementById('edit-p-buy').value = item.buy_price;
    document.getElementById('edit-p-sell').value = item.sell_price;
    document.getElementById('edit-p-qr').value = item.qr_code;
    if(document.getElementById('edit-modal')) document.getElementById('edit-modal').classList.add('show');
};

window.deleteStock = function(id) {
    if(!confirm("Delete this product?")) return;
    const formData = new FormData();
    formData.append('action', 'delete_stock');
    formData.append('id', id);
    fetch('../Stock_management/stock_backend.php', { method: 'POST', body: formData })
    .then(res => res.json()).then(res => { if(res.status === 'success') window.fetchStocks(); });
};

window.initStockModule();
