/**
 * FILE: accessories.js
 * PURPOSE: Global UI and Data Controller for Accessories Stock 
 * (Liquid Glass Premium Executive Engine)
 */

window.allAccessories = [];

// 1. DATA REFRESH
window.fetchAccessories = function() {
    fetch('../Acessories_dashboard/accessories_api.php?action=get_products')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                window.allAccessories = data.data;
                window.renderAccessoriesTable(data.data);
                window.updateAccStats(data.data);

                // Permission Guard: Lockdown all management actions
                if (typeof window.checkPermission === 'function' && !window.checkPermission('Accessories')) {
                    document.querySelectorAll('.add-product-btn, .action-btns').forEach(el => el.style.display = 'none');
                    console.log("Access restricted: Accessories Management");
                }
            }
        });
};

// 2. UI RENDERING
window.renderAccessoriesTable = function(accList) {
    const tbody = document.getElementById('accessories-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if(accList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 20px;">No accessories found.</td></tr>`;
        return;
    }

    accList.forEach(acc => {
        let stockVal = parseInt(acc.stock) || 0;
        let limitVal = parseInt(acc.alert_limit) || 5;
        let stockClass = stockVal <= limitVal ? "st-bal text-red" : "st-bal text-green";
        
        let imgHtml = acc.image_path ? `<img src="${acc.image_path}" style="width:40px; height:40px; object-fit:cover; border-radius:5px; border:1px solid #ddd;">` : `<i class="fa-solid fa-image" style="color:#555; font-size:1.5rem;"></i>`;

        tbody.innerHTML += `
            <tr>
                <td style="text-align:center;">${imgHtml}</td>
                <td class="st-name">${acc.name}</td>
                <td class="st-cat">${acc.category}</td>
                <td class="st-price">Rs. ${acc.buy_price}</td>
                <td class="st-price">Rs. ${acc.sell_price}</td>
                <td class="${stockClass}">${acc.stock}</td>
                <td>
                    <div class="action-btns">
                        <button class="edit-btn" onclick="window.editAccessory('${acc.id}')" title="Edit Accessory"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="delete-btn" onclick="window.deleteAccessory('${acc.id}')" title="Delete Accessory"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
};

window.updateAccStats = function(accList) {
    const totalEl = document.getElementById('total-accessories-badge');
    const lowEl = document.getElementById('low-accessories-badge');
    if(totalEl) totalEl.innerText = accList.length;
    if(lowEl) {
        const low = accList.filter(a => {
            let stockVal = parseInt(a.stock) || 0;
            let limitVal = parseInt(a.alert_limit) || 5;
            return stockVal <= limitVal;
        }).length;
        lowEl.innerText = low;
    }
};

window.toggleAccForm = function(forceClose = false) {
    const formSec = document.getElementById('acc-form-section');
    if(!formSec) return;
    
    if(forceClose) {
        formSec.style.display = 'none';
        document.getElementById('acc-form').reset();
        document.getElementById('acc-id').value = '';
    } else {
        if(formSec.style.display === 'none' || formSec.style.display === '') {
            formSec.style.display = 'block';
            document.getElementById('acc-name').focus();
        } else {
            formSec.style.display = 'none';
            document.getElementById('acc-form').reset();
            document.getElementById('acc-id').value = '';
        }
    }
};

// 3. STORAGE HANDLERS
window.saveAccessory = function() {
    const form = document.getElementById('acc-form');
    if(!form.name.value) { alert('Accessory Name is required.'); return; }
    
    const formData = new FormData(form);
    
    fetch('../Acessories_dashboard/accessories_api.php', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                window.fetchAccessories();
                window.toggleAccForm(true);
            } else {
                alert(data.message);
            }
        })
        .catch(err => {
            console.error('Save error:', err);
            alert('Failed to save accessory. Check console.');
        });
};

// 4. CRUD HELPERS
window.deleteAccessory = function(id) {
    if (confirm("Are you sure you want to delete this accessory?")) {
        const fd = new FormData();
        fd.append('action', 'delete_product');
        fd.append('id', id);
        
        fetch('../Acessories_dashboard/accessories_api.php', { method: 'POST', body: fd })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    window.fetchAccessories();
                } else {
                    alert(data.message);
                }
            });
    }
};

window.closeAccEditModal = function() {
    const modal = document.getElementById('edit-acc-modal');
    if(modal) modal.style.display = 'none';
};

window.toggleAccExportModal = function() {
    const modal = document.getElementById('export-acc-modal');
    if(!modal) return;
    if(modal.style.display === 'none' || modal.style.display === '') {
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
};

window.editAccessory = function(id) {
    const acc = window.allAccessories.find(a => a.id == id);
    if(!acc) return;
    
    // Populate EDIT modal form
    const form = document.getElementById('edit-acc-form');
    form.id.value = acc.id;
    form.name.value = acc.name;
    form.category.value = acc.category;
    form.short_name.value = acc.short_name;
    form.stock.value = acc.stock;
    form.alert_limit.value = acc.alert_limit || 5;
    form.buy_price.value = acc.buy_price;
    form.sell_price.value = acc.sell_price;
    
    // Show overlay modal
    const modal = document.getElementById('edit-acc-modal');
    if(modal) {
        modal.style.display = 'flex';
    }
};

window.saveEditAccessory = function() {
    const form = document.getElementById('edit-acc-form');
    if(!form.name.value) { alert('Accessory Name is required.'); return; }
    
    const formData = new FormData(form);
    
    fetch('../Acessories_dashboard/accessories_api.php', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                window.fetchAccessories();
                window.closeAccEditModal();
            } else {
                alert(data.message);
            }
        });
};

// 5. SEARCH & FILTER
window.filterAccByCategory = function(category) {
    // Update active pill visually
    const pills = document.querySelectorAll('.stock-controls .filter-pill');
    pills.forEach(p => p.classList.remove('active'));
    const clickedPill = document.querySelector(`.stock-controls .filter-pill[data-cat='${category}']`);
    if(clickedPill) clickedPill.classList.add('active');
    
    if(category === 'all') {
        window.renderAccessoriesTable(window.allAccessories);
    } else {
        const filtered = window.allAccessories.filter(a => a.category === category);
        window.renderAccessoriesTable(filtered);
    }
};

window.filterAccBySearch = function() {
    const input = document.getElementById('acc-search').value.toLowerCase();
    const table = document.getElementById('accessories-table');
    if(!table) return;
    const tr = table.getElementsByTagName('tr');
    
    for (let i = 1; i < tr.length; i++) {
        let match = tr[i].innerText.toLowerCase().includes(input);
        tr[i].style.display = match ? "" : "none";
    }
};

// INITIAL LOAD
window.fetchAccessories();

// EXPORT TO PDF ENGINE
window.generateAccessoriesReport = function(mode = 'save') {
    console.log("Generating Accessories Report...", mode);
    
    if(window.allAccessories.length === 0) {
        alert("No accessories to export.");
        return;
    }

    const reportContainer = document.getElementById('hidden-acc-report');
    if(!reportContainer) { alert("Report container missing."); return; }
    
    reportContainer.innerHTML = '';
    reportContainer.style.display = 'block';
    reportContainer.style.width = '794px';

    const dateTime = new Date().toLocaleString();
    let totalStockVal = 0;
    let expectedProfit = 0;
    const catCounts = {};

    window.allAccessories.forEach(a => {
        let count = parseInt(a.stock || 0);
        let buy = parseFloat(a.buy_price || 0);
        let sell = parseFloat(a.sell_price || 0);
        
        totalStockVal += (buy * count);
        expectedProfit += ((sell - buy) * count);

        let cat = a.category || 'Other';
        catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    let reportHTML = `
        <div id="acc-report-printable" style="background: #fff; width: 794px; padding: 25px; box-sizing: border-box; font-family: 'Outfit', sans-serif; color: #000; font-size: 11pt;">
            <div style="border: 4px double #1e3a8a; padding: 15px; min-height: 1050px; position: relative;">
                <div style="text-align: center; border-bottom: 3px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 30px; overflow: hidden;">
                    <img src="../assets/images/Untitled%20design.png" style="width: 100px; float: left;">
                    <div style="margin-left: 120px; text-align: center;">
                        <h1 style="color: #1e3a8a; margin: 0; font-size: 32pt; letter-spacing: 2px;">CREATIVE VISION</h1>
                        <p style="margin: 5px 0; font-weight: bold; font-size: 14pt;">Accessories Stock Intelligence Report</p>
                        <p style="margin: 2px 0;">Creative Vision - Dehiwala, Galle Road 79, Colombo.</p>
                        <p style="margin: 2px 0; font-weight: bold; color: #2563eb;">Phone: +94 77-230-2233</p>
                    </div>
                </div>

                <div style="text-align: right; margin-bottom: 15px; font-weight: bold;">
                    Report ID: CV-ACC-${Date.now().toString().slice(-6)}<br>
                    Date: ${dateTime}
                </div>

                <div style="text-align: center; margin-bottom: 15px;">
                    <h2 style="text-transform: uppercase; font-size: 20pt; border-bottom: 1px solid #ddd; display: inline-block; padding-bottom: 5px;">Inventory Overview</h2>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div style="border: 1px solid #1e3a8a; padding: 10px; background: #f0f7ff; border-left: 10px solid #1e3a8a;">
                        <h3 style="margin-top: 0; font-size: 12pt; color: #1e3a8a; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Items Analysis</h3>
                        <p style="margin: 5px 0;">Total Unique Accessories: <b style="font-size: 13pt;">${window.allAccessories.length}</b></p>
                        <p style="margin: 5px 0;">Total Inventory Cost Value: <b style="color: #b91c1c;">Rs. ${totalStockVal.toLocaleString()}</b></p>
                        <p style="margin: 5px 0;">Estimated Gross Profit Base: <b style="color: #15803d; font-size: 12pt;">Rs. ${expectedProfit.toLocaleString()}</b></p>
                    </div>
                    
                    <div style="border: 1px solid #1e3a8a; padding: 5px; background: #fff;">
                       <h3 style="margin-top: 0; font-size: 12pt; text-align: center; color: #1e3a8a;">Category Distribution Chart</h3>
                       <div style="display: flex; justify-content: center;">
                           <canvas id="accReportChart" width="300" height="130"></canvas>
                       </div>
                    </div>
                </div>

                <!-- TABLE DATA -->
                <div style="border: 1px solid #000; margin-bottom: 30px;">
                    <div style="background: #1e3a8a; color: #fff; padding: 10px; font-weight: bold; text-align: center; text-transform: uppercase; font-size: 10pt;">Current Accessories Manifest</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; color: #000000 !important;">
                        <thead style="background: #f1f5f9; color: #000000 !important;">
                            <tr>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: center; color:#000;">Photo</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; color:#000;">Name</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; color:#000;">Category</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; color:#000;">Cost (Rs.)</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; color:#000;">Est. Profit (Rs.)</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; color:#000;">Bal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${window.allAccessories.map(acc => {
                                let cst = parseFloat(acc.buy_price || 0);
                                let sl = parseFloat(acc.sell_price || 0);
                                let pf = (sl - cst) * parseInt(acc.stock || 0);
                                return `
                                <tr style="color: #000000 !important;">
                                    <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">
                                        ${acc.image_path ? `<img src="${acc.image_path}" style="width:20px; height:20px; object-fit:cover; border:1px solid #ccc;">` : `-`}
                                    </td>
                                    <td style="padding: 6px; border: 1px solid #ddd; color: #000;">${acc.name}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; font-style: italic; color: #000;">${acc.category}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: #000;">${cst.toFixed(2)}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: #166534;">+${pf.toFixed(2)}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: ${acc.stock <= acc.alert_limit ? '#dc2626' : '#166534'}; font-weight: bold;">${acc.stock}</td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="position: absolute; bottom: 15px; width: 100%; text-align: center; border-top: 2px solid #1e3a8a; padding-top: 15px; font-size: 9pt; color: #555;">
                    <p style="margin: 2px 0; color:#000;">Confidential Intelligence Document of <b style="color:#000;">Creative Vision Communication Shop</b>.</p>
                </div>
            </div>
        </div>
    `;

    reportContainer.innerHTML = reportHTML;

    // RENDER CHART DYNAMICALLY
    setTimeout(() => {
        const ctx = document.getElementById('accReportChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(catCounts),
                datasets: [{
                    label: 'Product Count',
                    data: Object.values(catCounts),
                    backgroundColor: ['#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#34d399', '#fbbf24', '#f87171'],
                    borderColor: '#000',
                    borderWidth: 1
                }]
            },
            options: { 
                responsive: false, 
                animation: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, ticks: { color: '#000', font: { size: 9 } } }, 
                    x: { ticks: { color: '#000', font: { size: 9 } } } 
                }
            }
        });

        const opt = {
            margin: [0,0,0,0],
            filename: 'Accessories_Stock_Report.pdf',
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { scale: 3, useCORS: true, letterRendering: true, width: 794 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const printable = document.getElementById('acc-report-printable');
        
        if (mode === 'save') {
             html2pdf().set(opt).from(printable).save().then(() => {
                 reportContainer.style.display = 'none';
                 window.toggleAccExportModal(); // Close overlay
             });
        } else {
             html2pdf().set(opt).from(printable).toPdf().get('pdf').then(pdf => {
                 window.open(pdf.output('bloburl'), '_blank').print();
                 reportContainer.style.display = 'none';
                 window.toggleAccExportModal(); // Close overlay
             });
        }
    }, 500);
};

console.log("Accessories Executive Engine Loading Complete.");
