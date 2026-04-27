/* 
  ========================================================
  FILE: script.js
  PURPOSE: Role switching and GUARANTEED NO-REFRESH Login.
  ======================================================== 
*/

function switchRole(role) {
    const btnStaff = document.getElementById('btn-staff');
    const btnAdmin = document.getElementById('btn-admin');
    const sliderBox = document.getElementById('toggle-slider');
    const formSlider = document.querySelector('.form-slider');
    const staffForm = document.getElementById('staff-form');
    const adminForm = document.getElementById('admin-form');

    if (role === 'staff') {
        btnStaff.classList.add('active');
        btnAdmin.classList.remove('active');
        sliderBox.style.left = '5px';
        sliderBox.style.background = 'linear-gradient(to right, #3b82f6, #60a5fa)';
        formSlider.style.transform = 'translateX(0%)';
        staffForm.classList.add('active-form');
        adminForm.classList.remove('active-form');
    } else if (role === 'admin') {
        btnAdmin.classList.add('active');
        btnStaff.classList.remove('active');
        sliderBox.style.left = 'calc(50% + 0px)';
        sliderBox.style.background = 'linear-gradient(to right, #8b5cf6, #c084fc)';
        formSlider.style.transform = 'translateX(-50%)';
        adminForm.classList.add('active-form');
        staffForm.classList.remove('active-form');
    }
}


/**
 * GUARANTEED NO-RELOAD SYSTEM
 * This manually pulls data from inputs and sends via AJAX.
 */
function doLogin(role) {
    // 1. Get the correct form's data
    const formId = (role === 'admin') ? 'admin-form' : 'staff-form';
    const form = document.getElementById(formId);
    const formData = new FormData(form);
    formData.append('ajax', 'true'); // Flag to PHP

    // Find the button to show "Busy" state
    const btn = form.querySelector('.submit-btn');
    const originalText = btn.innerText;
    btn.innerText = "Checking Details...";
    btn.disabled = true;

    // 2. Fetch data (This happens in the background)
    fetch('index.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // Reset button
        btn.innerText = originalText;
        btn.disabled = false;

        if (data.status === 'success') {
            // SUCCESS - Go to Dashboard
            window.location.href = data.redirect;
        } else {
            // THE PROMPT ERROR (No Refresh Possible)
            alert(data.message); 
        }
    })
    .catch(error => {
        console.error('Error:', error);
        btn.innerText = originalText;
        btn.disabled = false;
        alert("System Error: Localhost could not respond.");
    });
}
