<?php
/**
 * DB CONFIGURATION
 * Shared across all modules.
 */

$db_host = 'localhost';
$db_user = 'root';
$db_pass = '';
$db_name = 'cv_redesingned'; // Corrected spelling from screenshot!

try {
    $conn = new PDO("mysql:host=$db_host;dbname=$db_name", $db_user, $db_pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    // We will handle errors in the controller to keep JSON format
    $db_connection_error = $e->getMessage();
}
?>
