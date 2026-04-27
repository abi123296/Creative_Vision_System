<?php
/**
 * BACKEND CONTROLLER: Staff Management
 * Refined to use the specific database: 'cv_redesingned'
 */

// We use silent reporting to avoid plain text errors breaking JSON
error_reporting(0); 

require_once '../config.php';
header('Content-Type: application/json');

// Check Initial Connection from config.php
if (isset($db_connection_error)) {
    echo json_encode(['status' => 'error', 'message' => 'Connection Error: ' . $db_connection_error]);
    exit;
}

// 1. Initialize DB Connection if not already setup
try {
    // Ensuring the database is selected (from config.php)
    $db_name = 'cv_redesingned'; // Correcting to your spelling
    $conn->exec("USE `$db_name` ");

    // We will ensure the tables have the correct columns!
    // Table: staff
    $conn->exec("CREATE TABLE IF NOT EXISTS staff (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stf_id VARCHAR(50) UNIQUE NOT NULL,
        stf_name VARCHAR(100) NOT NULL,
        stf_role VARCHAR(100) NOT NULL,
        stf_salary DECIMAL(10,2) NOT NULL,
        stf_time VARCHAR(100) NOT NULL,
        stf_qr LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // If the table already existed and is missing 'stf_id' (legacy from other versions)
    // we help the user by checking if it exists
    $check_stf_id = $conn->query("SHOW COLUMNS FROM `staff` LIKE 'stf_id'");
    if (!$check_stf_id->fetch()) {
        // Drop it so we can recreate it correctly if it's an old incompatible version
        $conn->exec("DROP TABLE IF EXISTS `staff_accounts` "); // Drop child first
        $conn->exec("DROP TABLE `staff` ");
        // Re-run creation
        $conn->exec("CREATE TABLE IF NOT EXISTS staff (
            id INT AUTO_INCREMENT PRIMARY KEY,
            stf_id VARCHAR(50) UNIQUE NOT NULL,
            stf_name VARCHAR(100) NOT NULL,
            stf_role VARCHAR(100) NOT NULL,
            stf_salary DECIMAL(10,2) NOT NULL,
            stf_time VARCHAR(100) NOT NULL,
            stf_qr LONGTEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
    }

    // Table: staff_accounts
    $conn->exec("CREATE TABLE IF NOT EXISTS staff_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stf_id VARCHAR(50) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        permissions TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (stf_id) REFERENCES staff(stf_id) ON DELETE CASCADE
    )");

    // FIX: Ensure stf_qr column exists in existing table
    try {
        $conn->exec("ALTER TABLE staff ADD COLUMN stf_qr LONGTEXT AFTER stf_time");
    } catch (Exception $e) {
        // Column probably already exists, ignore
    }


    // Admin Table
    $conn->exec("CREATE TABLE IF NOT EXISTS admin (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
    )");

} catch(PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Table creation failed: ' . $e->getMessage()]);
    exit;
}

// 2. Process Actions
$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'fetch_staff':
        $stmt = $conn->query("SELECT * FROM staff ORDER BY id DESC");
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['status' => 'success', 'data' => $results]);
        break;

    case 'fetch_accounts':
        $stmt = $conn->query("SELECT * FROM staff_accounts ORDER BY id DESC");
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['status' => 'success', 'data' => $results]);
        break;

    case 'save_staff':
        $stf_id = $_POST['stf_id'];
        $stf_name = $_POST['stf_name'];
        $stf_role = $_POST['stf_role'];
        $stf_salary = $_POST['stf_salary'];
        $stf_time = $_POST['stf_time'];

        $stf_qr = $_POST['stf_qr'] ?? '';

        try {
            $stmt = $conn->prepare("REPLACE INTO staff (stf_id, stf_name, stf_role, stf_salary, stf_time, stf_qr) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$stf_id, $stf_name, $stf_role, $stf_salary, $stf_time, $stf_qr]);
            echo json_encode(['status' => 'success', 'message' => 'Profile saved successfully!']);
        } catch(PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'Save Failed: ' . $e->getMessage()]);
        }
        break;

    case 'delete_staff':
        $stf_id = $_POST['stf_id'];
        try {
            $stmt = $conn->prepare("DELETE FROM staff WHERE stf_id = ?");
            $stmt->execute([$stf_id]);
            echo json_encode(['status' => 'success', 'message' => 'Deleted.']);
        } catch(PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'Delete Failed: ' . $e->getMessage()]);
        }
        break;

    case 'save_account':
        $stf_id = $_POST['acc_staff_id'];
        $username = $_POST['acc_username'];
        $password = password_hash($_POST['acc_pass'], PASSWORD_DEFAULT);
        $phone = $_POST['acc_phone'];
        $permissions = $_POST['permissions'] ?? '';

        try {
            $stmt = $conn->prepare("REPLACE INTO staff_accounts (stf_id, username, password, phone, permissions) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$stf_id, $username, $password, $phone, $permissions]);
            echo json_encode(['status' => 'success', 'message' => 'Account activated!']);
        } catch(PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'Account setup failed: ' . $e->getMessage()]);
        }
        break;

    case 'delete_account':
        $username = $_POST['username'];
        try {
            $stmt = $conn->prepare("DELETE FROM staff_accounts WHERE username = ?");
            $stmt->execute([$username]);
            echo json_encode(['status' => 'success', 'message' => 'Revoked.']);
        } catch(PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'Revoke Error: ' . $e->getMessage()]);
        }
        break;
}
?>
