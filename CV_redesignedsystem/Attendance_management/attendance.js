// ============================================
// ATTENDANCE LOGIC FOR REDESIGNED SYSTEM
// ============================================

(function() {
    // Isolated interval to keep focus on scanner ONLY if the module is loaded
    const focusInterval = setInterval(() => {
        const qrInput = document.getElementById("qrInput");
        if (!qrInput) {
            // Module probably unmounted, clear interval to avoid leaks!
            clearInterval(focusInterval);
            return;
        }
        
        // Prevent stealing focus from other inputs/dialogs
        const tag = document.activeElement ? document.activeElement.tagName : '';
        if (tag === 'INPUT' && document.activeElement !== qrInput) return;
        if (tag === 'TEXTAREA' || tag === 'SELECT') return;
        
        qrInput.focus();
    }, 500);

    // Document-level click capture with scoping
    document.addEventListener("click", (e) => {
        const qrInput = document.getElementById("qrInput");
        if (!qrInput) return;
        
        const tag = e.target.tagName;
        if (tag !== 'INPUT' && tag !== 'BUTTON' && tag !== 'SELECT' && tag !== 'TEXTAREA') {
             qrInput.focus();
        }
    });
})();

window.handleQRScan = function(e) {
    const qrInput = document.getElementById("qrInput");
    if (!qrInput) return;

    if (e.key === "Enter") {
        let raw = qrInput.value.trim();
        qrInput.value = "";
        if (!raw) return;

        console.log("QR Scan Detected:", raw);

        // 🔥 SMART EXTRACTION: Try to find STF plus digits anywhere in the scan (case-insensitive)
        let match = raw.match(/STF\d+/i);
        let staff_id = match ? match[0].toUpperCase() : raw;
        
        console.log("🎯 Extracted ID:", staff_id);
        window.sendToServer(staff_id);
    }
};

// Add listener to the QR specifically, or grab document-wide keydowns if focused
document.addEventListener("keydown", (e) => {
    if(e.target && e.target.id === "qrInput") {
        window.handleQRScan(e);
    }
});


// ================= API HOOKS =================
window.sendToServer = function(staff_id) {
    fetch("../Attendance_management/attendance_api.php?action=scan", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "staff_id=" + encodeURIComponent(staff_id)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "success") {
            window.loadAttendance();
        } else if (data.message.includes("Staff not registered")) {
            // Trigger the Link Modal
            window.openLinkModal(staff_id);
        } else {
            alert(data.message);
        }
    })
    .catch(err => {
        console.error("API error:", err);
        alert("Failed to connect to scanner API.");
    });
};

window.openLinkModal = function(scannedCode) {
    const modal = document.getElementById('linkQrModal');
    const select = document.getElementById('linkStaffSelect');
    const hiddenInput = document.getElementById('pendingQrCode');
    
    if(!modal || !select || !hiddenInput) return;

    hiddenInput.value = scannedCode;
    select.innerHTML = '<option value="">Loading staff list...</option>';
    modal.style.display = 'flex';

    // Fetch staff list for dropdown
    fetch("../Attendance_management/attendance_api.php?action=get_staff")
        .then(r => r.json())
        .then(res => {
            if(res.status === 'success') {
                select.innerHTML = '<option value="">-- Choose Staff Member --</option>';
                res.data.forEach(s => {
                    select.innerHTML += `<option value="${s.id}">${s.stf_name} (Current: ${s.stf_id})</option>`;
                });
            }
        });
};

window.saveQrLink = function() {
    const dbId = document.getElementById('linkStaffSelect').value;
    const qrCode = document.getElementById('pendingQrCode').value;

    if(!dbId) { alert("Please select a staff member."); return; }

    fetch("../Attendance_management/attendance_api.php?action=link_qr", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `staff_db_id=${dbId}&new_qr_code=${encodeURIComponent(qrCode)}`
    })
    .then(r => r.json())
    .then(res => {
        if(res.status === 'success') {
            document.getElementById('linkQrModal').style.display = 'none';
            // Now that it is linked, try to mark attendance automatically
            window.sendToServer(qrCode); 
        } else {
            alert(res.message);
        }
    });
};


// ================= DATA LOADING =================
window.loadAttendance = function() {
    fetch("../Attendance_management/attendance_api.php?action=get")
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById("attendanceBody");
            if(!tbody) return;
            tbody.innerHTML = "";
            
            if (!data || !data.rows || data.rows.length === 0) {
                tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 30px; font-weight: 500; font-size: 1.1rem; color:rgba(255,255,255,0.4);">No records found. Awaiting QR scans...</td></tr>`;
                document.getElementById("totalHours").innerText = "0.00";
                document.getElementById("totalSalary").innerText = "Rs. 0.00";
                document.getElementById("totalCredits").innerText = "Rs. 0.00";
                document.getElementById("totalBalance").innerText = "Rs. 0.00";
                return;
            }

            data.rows.forEach(row => {
                let checkIn = row.check_in ? row.check_in : '--';
                let checkOut = row.check_out ? row.check_out : `<span style="color:#f59e0b; font-size:12px; font-weight:bold;">Active</span>`;
                
                let tr = `
                <tr class="table-row-hover" style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 15px; font-weight: bold; color:var(--text-high);">${row.name || ""}</td>
                    <td style="padding: 15px; color:#999;">${row.staff_id || ""}</td>
                    <td style="padding: 15px; color:#aaa;">${row.role || ""}</td>
                    <td style="padding: 15px; font-family:'JetBrains Mono',monospace;">${checkIn}</td>
                    <td style="padding: 15px; font-family:'JetBrains Mono',monospace;">${checkOut}</td>
                    <td style="padding: 15px; font-weight:bold;">${row.hours || "0"} Hrs</td>
                    <td style="padding: 15px; color:#aaa;">Rs. ${parseFloat(row.salary_per_hour).toFixed(2)}</td>
                    <td style="padding: 15px; color:#10b981; font-weight:bold;">Rs. ${parseFloat(row.total_salary || 0).toFixed(2)}</td>
                    <td style="padding: 15px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span style="color:#ef4444; font-weight:bold; min-width: 65px;">Rs. ${parseFloat(row.credit || 0).toFixed(2)}</span>
                            <button class="add-credit-mini-btn" onclick="window.openCreditModal('${row.staff_id}', '${row.name}')" title="Issue Credit">
                                <i class="fa-solid fa-plus"></i>
                            </button>
                        </div>
                    </td>
                    <td style="padding: 15px; font-weight:bold; color:#3b82f6;">Rs. ${parseFloat(row.balance || 0).toFixed(2)}</td>
                </tr>
                `;
                tbody.innerHTML += tr;
            });

            document.getElementById("totalHours").innerText = parseFloat(data.summary.total_hours || 0).toFixed(2);
            document.getElementById("totalSalary").innerText = "Rs. " + parseFloat(data.summary.total_salary || 0).toFixed(2);
            document.getElementById("totalCredits").innerText = "Rs. " + parseFloat(data.summary.total_credit || 0).toFixed(2);
            document.getElementById("totalBalance").innerText = "Rs. " + parseFloat(data.summary.total_balance || 0).toFixed(2);

            // Permission Guard
            if (typeof window.checkPermission === 'function' && !window.checkPermission('Attendance')) {
                document.querySelectorAll('.btn-group, .attendance-module .primary-btn').forEach(btn => btn.style.display = 'none');
                console.log("Access restricted: Attendance Actions");
            }
        })
        .catch(err => {
            console.error("Data Load Error:", err);
        });
};

// ================= CREDIT MODAL LOGIC =================
window.openCreditModal = function(sid, name) {
    document.getElementById('creditStaffId').value = sid;
    document.getElementById('creditStaffName').value = name;
    document.getElementById('creditAmount').value = "";
    document.getElementById('creditReason').value = "";
    document.getElementById('creditGivenBy').value = "";
    document.getElementById('addCreditModal').style.display = 'flex';
};

window.closeCreditModal = function() {
    document.getElementById('addCreditModal').style.display = 'none';
};

window.saveCredit = function() {
    const sid = document.getElementById('creditStaffId').value;
    const amount = document.getElementById('creditAmount').value;
    const reason = document.getElementById('creditReason').value;
    const givenBy = document.getElementById('creditGivenBy').value;

    if(!amount || amount <= 0) { alert("Please enter a valid credit amount."); return; }
    if(!givenBy) { alert("Please enter who is authorizing this credit."); return; }

    const body = `staff_id=${encodeURIComponent(sid)}&amount=${amount}&reason=${encodeURIComponent(reason)}&given_by=${encodeURIComponent(givenBy)}`;

    fetch("../Attendance_management/attendance_api.php?action=credit", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "success") {
            window.closeCreditModal();
            window.loadAttendance();
        } else {
            alert(data.message);
        }
    })
    .catch(() => alert("Failed to issue credit. Check network."));
};

window.finalizeSalary = function() {
    alert("Finalize Salary: This feature is being prepared. It will generate a payroll report and lock today's sessions.");
};

// ================= AUDIT LOG LOGIC =================
window.viewCreditsToday = function() {
    fetch("../Attendance_management/attendance_api.php?action=get_credits_today")
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const tbody = document.getElementById('viewCreditsBody');
                tbody.innerHTML = '';
                
                if (data.data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 25px; color:rgba(255,255,255,0.4);">No credits issued today.</td></tr>`;
                } else {
                    data.data.forEach(log => {
                        // Format the timestamp nicely
                        const timeStr = new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        
                        tbody.innerHTML += `
                        <tr class="table-row-hover" style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 15px; font-weight: bold; color:var(--text-high);">${log.name || 'Unknown'}</td>
                            <td style="padding: 15px; color:#ef4444; font-weight:bold;">Rs. ${parseFloat(log.amount).toFixed(2)}</td>
                            <td style="padding: 15px; color:#3b82f6; font-weight:bold;">Rs. ${parseFloat(log.lifetime_total || 0).toFixed(2)}</td>
                            <td style="padding: 15px; color:#aaa;">${log.reason || 'Manual Update'}</td>
                            <td style="padding: 15px; color:#aaa;">${log.given_by || 'System'}</td>
                            <td style="padding: 15px; font-family:'JetBrains Mono',monospace;">${timeStr}</td>
                        </tr>`;
                    });
                }
                
                document.getElementById('viewCreditsModal').style.display = 'flex';
            } else {
                alert("Failed to load credit history: " + data.message);
            }
        })
        .catch(() => alert("Network error while loading credit logs."));
};

window.closeViewCreditsModal = function() {
    document.getElementById('viewCreditsModal').style.display = 'none';
};

// Initialization
if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.loadAttendance);
} else {
    window.loadAttendance();
}
