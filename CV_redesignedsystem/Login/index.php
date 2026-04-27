<?php
/**
 * BACKEND CONTROLLER: Login
 * Handles Admin login, Staff login, and Forgot Password logic.
 * Location: login/index.php
 */

session_start();
require_once '../config.php';
header('Content-Type: application/json');

// Check Current Database Connection
if (isset($db_connection_error)) {
    echo json_encode(['status' => 'error', 'message' => 'DB Connection Error: ' . $db_connection_error]);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $action = $_POST['action'] ?? '';

    // 1. ADMIN LOGIN (Using Database with Hardcoded Fallback)
    if (isset($_POST["admin_username"])) {
        $entered_user = $_POST["admin_username"];
        $entered_pass = $_POST["admin_password"];

        // DEFAULT FALLBACK (Always works)
        $default_admin_user = "admin";
        $default_admin_pass = "admin123";

        try {
            $stmt = $conn->prepare("SELECT * FROM admin WHERE username = ?");
            $stmt->execute([$entered_user]);
            $admin = $stmt->fetch(PDO::FETCH_ASSOC);

            // Check Database OR Fallback
            if (($admin && password_verify($entered_pass, $admin['password'])) || 
                ($entered_user === $default_admin_user && $entered_pass === $default_admin_pass)) {
                
                $_SESSION['admin_logged_in'] = true;
                $_SESSION['role'] = 'admin';
                $_SESSION['username'] = $entered_user;

                echo json_encode(['status' => 'success', 'redirect' => '../admin_dashboard/index.php']);
                exit();
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Invalid admin credentials.']);
                exit();
            }
        } catch(PDOException $e) {
            // Even if DB fails, fallback should work
            if ($entered_user === $default_admin_user && $entered_pass === $default_admin_pass) {
                $_SESSION['admin_logged_in'] = true;
                $_SESSION['role'] = 'admin';
                $_SESSION['username'] = $entered_user;
                echo json_encode(['status' => 'success', 'redirect' => '../admin_dashboard/index.php']);
                exit();
            }
            echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
            exit();
        }
    }

    // 2. STAFF LOGIN (Using Database)
    if (isset($_POST["staff_username"])) {
        $entered_user = $_POST["staff_username"];
        $entered_pass = $_POST["staff_password"];

        try {
            // Join staff_accounts with staff table to get permissions and role
            $stmt = $conn->prepare("SELECT sa.*, s.stf_role, s.stf_name FROM staff_accounts sa JOIN staff s ON sa.stf_id = s.stf_id WHERE sa.username = ?");
            $stmt->execute([$entered_user]);
            $staff = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($staff && password_verify($entered_pass, $staff['password'])) {
                $_SESSION['staff_logged_in'] = true;
                $_SESSION['role'] = $staff['stf_role'];
                $_SESSION['username'] = $staff['username'];
                $_SESSION['name'] = $staff['stf_name'];
                $_SESSION['permissions'] = $staff['permissions'];

                echo json_encode(['status' => 'success', 'redirect' => '../staff_dashboard/index.php']);
                exit();
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Invalid staff credentials.']);
                exit();
            }
        } catch(PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
            exit();
        }
    }

    // 3. FORGOT PASSWORD (Using Database)
    if ($action === 'reset_password') {
        $username = $_POST['reset_username'];
        $phone = $_POST['reset_phone'];
        $new_pass = password_hash($_POST['new_pass'], PASSWORD_DEFAULT);

        try {
            // Check if username and phone match
            $stmt = $conn->prepare("SELECT * FROM staff_accounts WHERE username = ? AND phone = ?");
            $stmt->execute([$username, $phone]);
            $acc = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($acc) {
                // Update password
                $upd = $conn->prepare("UPDATE staff_accounts SET password = ? WHERE username = ?");
                $upd->execute([$new_pass, $username]);
                echo json_encode(['status' => 'success', 'message' => 'Password reset successful! You can now login.']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Username and Phone number do not match our records.']);
            }
        } catch(PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
        }
        exit();
    }

} else {
    header("Location: login.html");
    exit();
}
?>
