<?php
/**
 * BACKEND: Logout
 * Clears all session data and redirects to login page.
 */
session_start();
session_unset();
session_destroy();

// Redirect to login page
header("Location: login.html");
exit();
?>
