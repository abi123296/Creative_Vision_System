<?php
/**
 * ENTRY POINT: Staff Dashboard
 * Checks for session and serves the HTML shell.
 */
session_start();

// Security Check: Redirect to login if not a logged-in staff member
if (!isset($_SESSION['staff_logged_in']) || $_SESSION['staff_logged_in'] !== true) {
    header("Location: ../login/login.html");
    exit();
}

$staffName = $_SESSION['name'] ?? 'Staff User';
$staffRole = $_SESSION['role'] ?? 'Regular Staff';
$permissions = $_SESSION['permissions'] ?? '';

// Load the UI Shell
echo "<script>
    const USER_PERMISSIONS = '$permissions';
    const USER_ROLE = '$staffRole';
</script>";
include 'staff_dashboard.html';
?>
