<?php
/* 
 ========================================================
 FILE: index.php
 PURPOSE: This is the backend controller for the Dashboard.
 It checks for valid Admin sessions and displays 
 the admin_dashboard.html file.
 ========================================================  */

// Step 1: Start the session robustly
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 86400,
        'path' => '/',
        'domain' => '',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

// Step 2: SECURE THE PAGE
// If the 'admin_logged_in' session variable is not set, 
// redirect them back to the login page immediately.
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: ../login/login.html");
    exit();
}

/**
 * Step 3: DISPLAY THE DASHBOARD
 * Since the user is confirmed as an Admin, we display the UI.
 * This keeps the URL as .../admin_dashboard/ while showing the HTML.
 */
include("admin_dashboard.html");
?>
