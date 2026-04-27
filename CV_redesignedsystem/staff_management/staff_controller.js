/**
 * FILE: staff_controller.js
 * PURPOSE: Core Data Management for Staff Profiles & Accounts.
 * (Reporting is now handled by the Universal Dashboard Engine)
 */

window.allStaff = [];
window.allAccounts = [];

console.log("Staff Core Controller Syncing...");

// 1. DATA REFRESH FUNCTIONS
window.fetchStaff = function() {
    fetch('../staff_management/index.php?action=fetch_staff')
        .then(res => res.json()).then(data => {
            if (data.status === 'success') {
                window.allStaff = data.data;
                window.renderStaffTable(data.data);
                window.populateStaffSelect(data.data);
            }
        });
};

window.fetchAccounts = function() {
    fetch('../staff_management/index.php?action=fetch_accounts')
        .then(res => res.json()).then(data => {
            if (data.status === 'success') {
                window.allAccounts = data.data;
                window.renderAccountsTable(data.data);
            }
        });
};

// 2. UI RENDERING
window.renderStaffTable = function(staffList) {
    const tbody = document.getElementById('staff-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    staffList.forEach(stf => {
        // Escaping role and name for safe JS passing
        const escName = stf.stf_name.replace(/'/g, "\\'");
        const escRole = stf.stf_role.replace(/'/g, "\\'");
        
        tbody.innerHTML += `
            <tr>
                <td class="st-id">${stf.stf_id}</td>
                <td>${stf.stf_name}</td>
                <td>${stf.stf_role}</td>
                <td>${stf.stf_salary}</td>
                <td>${stf.stf_time}</td>
                <td>
                    <div class="action-btns">
                        <button class="qr-btn" title="Reprint ID Card" onclick="window.viewExistingQR('${stf.stf_id}', '${escName}', '${escRole}')">
                            <i class="fa-solid fa-qrcode"></i>
                        </button>
                        <button class="edit-btn" onclick="window.editStaff('${stf.stf_id}', '${escName}', '${escRole}', '${stf.stf_salary}', '${stf.stf_time}')">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="delete-btn" onclick="window.deleteStaff('${stf.stf_id}')">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    });
};

window.viewExistingQR = function(id, name, role) {
    // 1. Find the staff data to get the saved QR base64
    const stf = window.allStaff.find(s => s.stf_id === id);
    if(!stf || !stf.stf_qr) {
        alert("No QR data found for this member. Please save their profile again to generate one.");
        return;
    }

    // 2. Set details in modal
    document.getElementById('qr-display-id').innerText = id;
    document.getElementById('qr-display-name').innerText = name;
    document.getElementById('qr-display-role').innerText = role;

    // 3. Put the stored QR image into the container
    const qrContainer = document.getElementById('qr-code-container');
    if(qrContainer) {
        qrContainer.innerHTML = `<img src="${stf.stf_qr}" style="width: 180px; height: 180px;">`;
    }

    // 4. Show modal
    const modal = document.getElementById('qr-success-modal');
    if(modal) modal.classList.add('show');
};

window.renderAccountsTable = function(accList) {
    const tbody = document.getElementById('accounts-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    accList.forEach(acc => {
        tbody.innerHTML += `<tr><td class="st-user">${acc.username}</td><td class="st-role">${acc.stf_id}</td><td>${acc.phone}</td><td class="st-perms">${acc.permissions}</td><td><div class="action-btns"><button class="edit-btn" onclick="window.editAccount('${acc.username}', '${acc.stf_id}', '${acc.phone}')"><i class="fa-solid fa-user-pen"></i></button><button class="delete-btn" onclick="window.deleteAccount('${acc.username}')"><i class="fa-solid fa-user-xmark"></i></button></div></td></tr>`;
    });
};

window.populateStaffSelect = function(staffList) {
    const select = document.getElementById('acc_staff_select');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>-- Choose Added Staff --</option>';
    staffList.forEach(stf => { select.innerHTML += `<option value="${stf.stf_id}">${stf.stf_name} (${stf.stf_id})</option>`; });
};

// 3. STORAGE HANDLERS
window.saveStaff = function() {
    const form = document.getElementById('add-staff-form');
    const formData = new FormData(form);
    
    const startTime = form.stf_time_start.value;
    const endTime = form.stf_time_end.value;
    const stf_id = form.stf_id.value;
    const stf_name = form.stf_name.value;
    const stf_role = form.stf_role.value;

    if(startTime && endTime) {
        formData.append('stf_time', `${startTime} - ${endTime}`);
    }

    // 1. GENERATE QR CODE LOCALLY
    const qrContainer = document.getElementById('qr-code-container');
    if(qrContainer) {
        qrContainer.innerHTML = '';
        // Create a data string for the QR
        const qrData = JSON.stringify({ id: stf_id, name: stf_name, role: stf_role });
        
        new QRCode(qrContainer, {
            text: qrData,
            width: 180,
            height: 180,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Small timeout to allow QR to render before grabbing base64
        setTimeout(() => {
            const qrImg = qrContainer.querySelector('img');
            if(qrImg) {
                formData.append('stf_qr', qrImg.src);
                
                // Finalize Save
                formData.append('action', 'save_staff');
                fetch('../staff_management/index.php', { method: 'POST', body: formData })
                    .then(res => res.json())
                    .then(data => { 
                        if (data.status === 'success') { 
                            window.fetchStaff(); 
                            form.reset(); 
                            window.toggleForm('staff-form-block'); 
                            window.showQRModal(stf_id, stf_name, stf_role);
                        } else {
                            alert(data.message);
                        }
                    });
            }
        }, 300);
    }
};

window.showQRModal = function(id, name, role) {
    document.getElementById('qr-display-id').innerText = id;
    document.getElementById('qr-display-name').innerText = name;
    document.getElementById('qr-display-role').innerText = role;
    const modal = document.getElementById('qr-success-modal');
    if(modal) modal.classList.add('show');
};

window.closeQRModal = function() {
    const modal = document.getElementById('qr-success-modal');
    if(modal) modal.classList.remove('show');
};

window.printQRCard = function() {
    const content = document.getElementById('printable-qr-card').innerHTML;
    const win = window.open('', '', 'height=600,width=800');
    win.document.write('<html><head><title>Print ID Card</title>');
    win.document.write('<link rel="stylesheet" href="../staff_management/style.css">');
    win.document.write('<style>body{background:white; color:black; display:flex; justify-content:center; align-items:center; height:100vh;} .qr-card{border: 2px solid #000; padding: 20px; width: 350px; text-align: center; color: black; background: white;}</style>');
    win.document.write('</head><body>');
    win.document.write(content);
    win.document.write('</body></html>');
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
};

window.downloadQRCard = function() {
    const card = document.getElementById('printable-qr-card');
    if(card) {
        html2canvas(card, {
            backgroundColor: "#ffffff",
            scale: 3, // High quality
            useCORS: true
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `CV_ID_${document.getElementById('qr-display-id').innerText}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        });
    }
};

window.saveAccount = function() {
    const form = document.getElementById('create-account-form');
    const formData = new FormData(form);
    formData.append('action', 'save_account');
    let perms = [];
    form.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => { perms.push(cb.nextElementSibling.innerText); });
    formData.append('permissions', perms.join(', '));
    fetch('../staff_management/index.php', { method: 'POST', body: formData }).then(res => res.json()).then(data => { alert(data.message); if (data.status === 'success') { window.fetchAccounts(); form.reset(); window.toggleForm('account-form-block'); } });
};

// 4. HELPERS
window.deleteStaff = function(id) { if (confirm("Delete this profile?")) { const fd = new FormData(); fd.append('action', 'delete_staff'); fd.append('stf_id', id); fetch('../staff_management/index.php', { method: 'POST', body: fd }).then(res => res.json()).then(data => { window.fetchStaff(); window.fetchAccounts(); }); } };
window.deleteAccount = function(user) { if (confirm("Revoke access?")) { const fd = new FormData(); fd.append('action', 'delete_account'); fd.append('username', user); fetch('../staff_management/index.php', { method: 'POST', body: fd }).then(res => res.json()).then(data => { window.fetchAccounts(); }); } };

window.editStaff = function(id, name, role, sal, time) { 
    window.toggleForm('staff-form-block'); 
    const form = document.getElementById('add-staff-form'); 
    form.stf_id.value = id; 
    form.stf_name.value = name; 
    form.stf_role.value = role; 
    form.stf_salary.value = sal; 
    
    // Split Time back to inputs
    if(time && time.includes(' - ')) {
        const parts = time.split(' - ');
        form.stf_time_start.value = parts[0];
        form.stf_time_end.value = parts[1];
    }
};
window.editAccount = function(user, stf_id, phone) { window.toggleForm('account-form-block'); const form = document.getElementById('create-account-form'); form.acc_username.value = user; form.acc_staff_id.value = stf_id; form.acc_phone.value = phone; };

window.toggleForm = function(blockId) { const block = document.getElementById(blockId); if (!block) return; block.style.display = (block.style.display === 'block') ? 'none' : 'block'; };
window.filterBothTables = function() { const val = document.getElementById('master-search').value.toLowerCase(); window.filterTable('staff-details-table', val); window.filterTable('staff-accounts-table', val); };
window.filterTable = function(tableId, filter) { const table = document.getElementById(tableId); if(!table) return; const tr = table.getElementsByTagName('tr'); for (let i = 1; i < tr.length; i++) { let match = tr[i].innerText.toLowerCase().includes(filter); tr[i].style.display = match ? "" : "none"; } };

// INITIAL LOAD
window.fetchStaff();
window.fetchAccounts();

console.log("Staff Core Controller Ready.");
