/**
 * LOGIC: Reload & Card Management
 * PURPOSE: Interactive Inventory Updates & Official Reporting
 */

// 1. INPUT INTERACTION
window.enableReloadEdit = function (inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.removeAttribute('readonly');
    input.focus();
    input.select();

    input.parentElement.style.borderColor = 'var(--accent)';
    input.parentElement.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.2)';

    input.onblur = () => {
        input.setAttribute('readonly', 'true');
        input.parentElement.style.borderColor = 'var(--card-border)';
        input.parentElement.style.boxShadow = 'none';
        window.updateTotalReloadValue();
    };
};

window.updateTotalReloadValue = function () {
    const getVal = (id) => parseFloat(document.getElementById(id).value) || 0;
    const total = getVal('dialogBalance') + getVal('mobitelBalance') + getVal('airtelBalance') + getVal('hutchBalance') + getVal('ezcashBalance');
    const totalEl = document.getElementById('total-reload-value');
    if (totalEl) totalEl.innerText = `Rs. ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
};

window.handleReloadKey = function (event) {
    if (event.key === 'Enter') event.target.blur();
};

// 2. DATABASE SYNCHRONIZATION
window.saveAllReloadData = function () {
    const balances = {
        dialog: document.getElementById('dialogBalance').value,
        mobitel: document.getElementById('mobitelBalance').value,
        airtel: document.getElementById('airtelBalance').value,
        hutch: document.getElementById('hutchBalance').value,
        ezcash: document.getElementById('ezcashBalance').value
    };

    const cards = [];
    document.querySelectorAll('.card-input').forEach(i => {
        cards.push({ network: i.dataset.network, value: i.dataset.value, quantity: i.value || 0 });
    });

    const formData = new FormData();
    formData.append('action', 'save_inventory');
    formData.append('balances', JSON.stringify(balances));
    formData.append('cards', JSON.stringify(cards));

    fetch('../Reload_management/reload_api.php', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                alert("✅ Reload Inventory synchronized successfully!");
                window.fetchReloadInventory();
            } else {
                alert("❌ Sync Error: " + data.message);
            }
        })
        .catch(() => alert("Failed to connect to the server."));
};

window.fetchReloadInventory = function () {
    fetch('../Reload_management/reload_api.php?action=fetch_inventory')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                data.balances.forEach(b => {
                    const id = b.network_name.toLowerCase().replace('ezcash', 'ezcash') + 'Balance';
                    const input = document.getElementById(id);
                    if (input) input.value = b.balance;
                });
                data.cards.forEach(c => {
                    const input = document.querySelector(`.card-input[data-network="${c.network_name}"][data-value="${c.denomination}"]`);
                    if (input) input.value = c.quantity;
                });
                window.updateTotalReloadValue();

                // Permission Guard: Force Lockdown (Runs after data load)
                if (typeof window.checkPermission === 'function' && !window.checkPermission('Reload Management')) {
                    const lock = () => {
                        document.querySelectorAll('.edit-action-btn, .ez-input-area .primary-btn, .master-save-btn').forEach(btn => btn.style.display = 'none');
                    };
                    lock();
                    // Pulse lock for 3 seconds to catch any late-rendering buttons
                    let count = 0;
                    const interval = setInterval(() => {
                        lock();
                        if (count++ > 10) clearInterval(interval);
                    }, 300);
                    console.log("Security: Reload Pulse Lock Active.");
                }
            }
        });
};

// 3. REPORTING ENGINE

window.toggleReloadExportModal = function () {
    const modal = document.getElementById('export-reload-modal');
    if (!modal) return;
    if (modal.style.display === 'none' || modal.style.display === '') {
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
};

window.generateReloadReport = function (mode = 'save') {
    console.log("Generating Reload Report...", mode);

    const reportContainer = document.getElementById('hidden-reload-report');
    if (!reportContainer) { alert("Report container missing."); return; }

    reportContainer.innerHTML = '';
    reportContainer.style.display = 'block';
    reportContainer.style.width = '794px';

    const dateTime = new Date().toLocaleString();

    // Fetch values directly from DOM
    const getVal = (id) => parseFloat(document.getElementById(id).value) || 0;

    const balances = {
        Dialog: getVal('dialogBalance'),
        Mobitel: getVal('mobitelBalance'),
        Airtel: getVal('airtelBalance'),
        Hutch: getVal('hutchBalance')
    };

    const ezCashVal = getVal('ezcashBalance');

    const cardData = [];
    document.querySelectorAll('.card-input').forEach(i => {
        let ntwk = i.dataset.network;
        let denom = parseFloat(i.dataset.value);
        let qty = parseInt(i.value) || 0;
        cardData.push({ network: ntwk, denomination: denom, quantity: qty });
    });

    // Calculations
    const totalNetworkBalance = balances.Dialog + balances.Mobitel + balances.Airtel + balances.Hutch;
    let totalCardValue = 0;
    let cardCountByNetwork = { Dialog: 0, Mobitel: 0, Airtel: 0, Hutch: 0 };

    cardData.forEach(c => {
        let val = c.denomination * c.quantity;
        totalCardValue += val;
        cardCountByNetwork[c.network] += c.quantity;
    });

    const totalInvestment = totalNetworkBalance + ezCashVal + totalCardValue;

    let reportHTML = `
        <div id="reload-report-printable" style="background: #fff; width: 794px; height: 1122px; padding: 25px; box-sizing: border-box; font-family: 'Outfit', sans-serif; color: #000; font-size: 11pt; overflow: hidden;">
            <div style="border: 4px double #1e3a8a; padding: 15px; height: 100%; box-sizing: border-box; position: relative; overflow: hidden;">
                <div style="text-align: center; border-bottom: 3px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 30px; overflow: hidden;">
                    <img src="../assets/images/Untitled%20design.png" style="width: 100px; float: left;">
                    <div style="margin-left: 120px; text-align: center;">
                        <h1 style="color: #1e3a8a; margin: 0; font-size: 32pt; letter-spacing: 2px;">CREATIVE VISION</h1>
                        <p style="margin: 5px 0; font-weight: bold; font-size: 14pt;">Reload & Card Inventory Report</p>
                        <p style="margin: 2px 0;">Creative Vision - Dehiwala, Galle Road 79, Colombo.</p>
                        <p style="margin: 2px 0; font-weight: bold; color: #2563eb;">Phone: +94 77-230-2233</p>
                    </div>
                </div>

                <div style="text-align: right; margin-bottom: 15px; font-weight: bold;">
                    Report ID: CV-REL-${Date.now().toString().slice(-6)}<br>
                    Date: ${dateTime}
                </div>

                <div style="text-align: center; margin-bottom: 15px;">
                    <h2 style="text-transform: uppercase; font-size: 18pt; border-bottom: 1px solid #ddd; display: inline-block; padding-bottom: 5px;">Data Summary Overview</h2>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div style="border: 1px solid #1e3a8a; padding: 10px; background: #f0f7ff; border-left: 10px solid #1e3a8a;">
                        <h3 style="margin-top: 0; font-size: 12pt; color: #1e3a8a; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Investment Summary</h3>
                        <p style="margin: 5px 0;">Total Network Balance: <b style="font-size: 11pt; color: #b91c1c;">Rs. ${totalNetworkBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></p>
                        <p style="margin: 5px 0;">EzCash Balance: <b style="font-size: 11pt; color: #ea580c;">Rs. ${ezCashVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></p>
                        <p style="margin: 5px 0;">Total Card Inventory Value: <b style="font-size: 11pt; color: #15803d;">Rs. ${totalCardValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></p>
                        <p style="margin: 10px 0 0 0; padding-top: 10px; border-top: 1px solid #ccc; font-size: 13pt;">Net Investment: <b style="color: #4338ca;">Rs. ${totalInvestment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></p>
                    </div>
                    
                    <div style="border: 1px solid #1e3a8a; padding: 10px; background: #fff;">
                       <h3 style="margin-top: 0; font-size: 12pt; text-align: center; color: #1e3a8a;">Physical Card Distribution</h3>
                       <div style="display: flex; justify-content: center;">
                           <canvas id="cardReportChart" width="280" height="120"></canvas>
                       </div>
                    </div>
                </div>

                <!-- DIGITAL BALANCES TABLE -->
                <div style="border: 1px solid #000; margin-bottom: 20px;">
                    <div style="background: #1e3a8a; color: #fff; padding: 8px; font-weight: bold; text-align: center; text-transform: uppercase; font-size: 10pt;">Network Digital Balances</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 9pt; color: #000;">
                        <thead style="background: #f1f5f9;">
                            <tr>
                                <th style="padding: 6px; border: 1px solid #ddd; text-align: left; color:#000;">Network</th>
                                <th style="padding: 6px; border: 1px solid #ddd; text-align: right; color:#000;">Balance (Rs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td style="padding: 6px; border: 1px solid #ddd;">Dialog</td><td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${balances.Dialog.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                            <tr><td style="padding: 6px; border: 1px solid #ddd;">Mobitel</td><td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${balances.Mobitel.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                            <tr><td style="padding: 6px; border: 1px solid #ddd;">Airtel</td><td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${balances.Airtel.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                            <tr><td style="padding: 6px; border: 1px solid #ddd;">Hutch</td><td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${balances.Hutch.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                            <tr style="background: #e0f2fe; font-weight: bold;"><td style="padding: 6px; border: 1px solid #ddd;">Total Digital Balance</td><td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${totalNetworkBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- SCRATCH CARDS TABLE -->
                <div style="border: 1px solid #000; margin-bottom: 20px;">
                    <div style="background: #1e3a8a; color: #fff; padding: 8px; font-weight: bold; text-align: center; text-transform: uppercase; font-size: 10pt;">Physical Card Inventory</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 9pt; color: #000;">
                        <thead style="background: #f1f5f9;">
                            <tr>
                                <th style="padding: 6px; border: 1px solid #ddd; text-align: left; color:#000;">Network</th>
                                <th style="padding: 6px; border: 1px solid #ddd; text-align: center; color:#000;">Denomination (Rs.)</th>
                                <th style="padding: 6px; border: 1px solid #ddd; text-align: center; color:#000;">Quantity</th>
                                <th style="padding: 6px; border: 1px solid #ddd; text-align: right; color:#000;">Total Value (Rs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cardData.map(c => `
                                <tr>
                                    <td style="padding: 6px; border: 1px solid #ddd;">${c.network}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${c.denomination}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${c.quantity === 0 ? '#dc2626' : '#166534'};">${c.quantity}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${(c.denomination * c.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            `).join('')}
                            <tr style="background: #dcfce7; font-weight: bold;">
                                <td colspan="3" style="padding: 6px; border: 1px solid #ddd; text-align: right;">Total Physical Card Stock Value</td>
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: #166534;">${totalCardValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
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
        const ctx = document.getElementById('cardReportChart');
        if (ctx) {
            new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(cardCountByNetwork),
                    datasets: [{
                        label: 'Card Quantity',
                        data: Object.values(cardCountByNetwork),
                        backgroundColor: ['#ef4444', '#fbcfe8', '#f87171', '#fb923c'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: false,
                    animation: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#000', boxWidth: 10, font: { size: 9 } } }
                    }
                }
            });
        }

        const opt = {
            margin: [0, 0, 0, 0],
            filename: 'Reload_Inventory_Report.pdf',
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { scale: 3, useCORS: true, letterRendering: true, width: 794 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const printable = document.getElementById('reload-report-printable');

        if (mode === 'save') {
            html2pdf().set(opt).from(printable).save().then(() => {
                reportContainer.style.display = 'none';
                window.toggleReloadExportModal();
            });
        } else {
            html2pdf().set(opt).from(printable).toPdf().get('pdf').then(pdf => {
                window.open(pdf.output('bloburl'), '_blank').print();
                reportContainer.style.display = 'none';
                window.toggleReloadExportModal();
            });
        }
    }, 500);
};

// INITIALIZATION
window.fetchReloadInventory();
document.querySelectorAll('#reload-module input[type="number"]').forEach(input => {
    input.addEventListener('keydown', window.handleReloadKey);
});

// Permission Guard: Force Lockdown
if (typeof window.checkPermission === 'function' && !window.checkPermission('Reload Management')) {
    // Hide Edit buttons on cards
    document.querySelectorAll('.edit-action-btn').forEach(btn => btn.style.display = 'none');
    
    // Hide EzCash Edit button
    const ezBtn = document.querySelector('.ez-input-area .primary-btn');
    if (ezBtn) ezBtn.style.display = 'none';

    // Hide Master Save button
    const masterSave = document.querySelector('.master-save-btn');
    if (masterSave) masterSave.style.display = 'none';
    
    console.log("Access restricted: Reload Management Management Controls Hidden");
}
