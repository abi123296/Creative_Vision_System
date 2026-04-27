/**
 * LOGIC: Credit Management Hub
 * Handles data fetching, local filtering, and UI updates.
 */

window.allCreditData = [];

window.loadCreditHistory = function() {
    const dateFilter = document.getElementById('creditDateFilter').value;
    const url = `../Credit_management/credits_api.php?action=fetch_history&date=${dateFilter}`;

    fetch(url)
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                window.allCreditData = res.data;
                document.getElementById('globalTotalCredit').innerText = `Rs. ${parseFloat(res.total_outstanding).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
                window.renderCreditTable(res.data);
            } else {
                console.error("API Error:", res.message);
            }
        })
        .catch(err => console.error("Network Error:", err));
};

window.renderCreditTable = function(data) {
    const tbody = document.getElementById('creditsTableBody');
    if (!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:50px; color:var(--text-low);">No records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(row => `
        <tr>
            <td class="date-col">${row.date}</td>
            <td class="name-col">${row.staff_name}</td>
            <td class="amount-col">Rs. ${parseFloat(row.amount).toFixed(2)}</td>
            <td>${row.reason || '<span style="color:var(--text-low)">-</span>'}</td>
            <td>${row.given_by}</td>
            <td><span class="status-badge">Advance</span></td>
        </tr>
    `).join('');
};

window.filterCredits = function() {
    const query = document.getElementById('creditSearch').value.toLowerCase();
    const filtered = window.allCreditData.filter(item => 
        item.staff_name.toLowerCase().includes(query)
    );
    window.renderCreditTable(filtered);
};

window.resetCreditFilters = function() {
    document.getElementById('creditSearch').value = '';
    document.getElementById('creditDateFilter').value = '';
    window.loadCreditHistory();
};

// INITIALIZE
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.loadCreditHistory);
} else {
    window.loadCreditHistory();
}
