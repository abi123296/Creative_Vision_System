<?php
/**
 * Printer Management API
 * Handles CRUD operations for Printers
 */

// Initialize session if needed
session_start();

// Include global database configuration
require_once '../config.php';

// Set JSON headers
header('Content-Type: application/json');

// Check connection
if (isset($db_connection_error)) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $db_connection_error]);
    exit;
}

// Get Action from URL
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Function to safely execute JSON input
function getJsonInput() {
    $raw = file_get_contents("php://input");
    return json_decode($raw, true);
}

try {
    switch ($action) {
        
        // 1. GET ALL PRINTERS
        case 'get':
            $stmt = $conn->prepare("SELECT * FROM printers ORDER BY id ASC");
            $stmt->execute();
            $printers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['status' => 'success', 'data' => $printers]);
            break;

        // 2. ADD NEW PRINTER
        case 'add':
            // Support both JSON payload and FormData
            $is_json = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false;
            $data = $is_json ? getJsonInput() : $_POST;

            if (!$data) {
                echo json_encode(['status' => 'error', 'message' => 'Invalid data payload']);
                exit;
            }

            // Image File Handling
            $image_url_db = trim($data['image_url'] ?? '');
            if (isset($_FILES['printer_image']) && $_FILES['printer_image']['error'] === UPLOAD_ERR_OK) {
                $upload_dir = '../assets/printers/';
                if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
                
                // Keep safe filename
                $filename = time() . '_' . preg_replace("/[^a-zA-Z0-9.]/", "", basename($_FILES['printer_image']['name']));
                $target_path = $upload_dir . $filename;
                
                if (move_uploaded_file($_FILES['printer_image']['tmp_name'], $target_path)) {
                    $image_url_db = $target_path;
                }
            }

            $name = trim($data['name'] ?? '');
            $print_counter = (int)($data['print_counter'] ?? 0);
            $toner_level = (int)($data['toner_level'] ?? 100);
            $is_color = isset($data['is_color']) && $data['is_color'] ? 1 : 0;
            
            // Set up default type based on color
            $type = $is_color ? 'Color Printer' : 'Monochrome Printer';
            
            // By default initialize color toners same as global if color printer
            $toner_c = $is_color ? $toner_level : 0;
            $toner_m = $is_color ? $toner_level : 0;
            $toner_y = $is_color ? $toner_level : 0;

            if (empty($name)) {
                echo json_encode(['status' => 'error', 'message' => 'Printer name is required']);
                exit;
            }

            $stmt = $conn->prepare("INSERT INTO printers (name, type, ip_address, image_url, print_counter, is_color, toner_black, toner_cyan, toner_magenta, toner_yellow, status) VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, ?, 'Active')");
            $success = $stmt->execute([$name, $type, $image_url_db, $print_counter, $is_color, $toner_level, $toner_c, $toner_m, $toner_y]);

            if ($success) {
                echo json_encode(['status' => 'success', 'message' => 'Printer added successfully']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Database error during insertion']);
            }
            break;

        // 3. UPDATE PRINTER STATUS
        case 'update':
            $data = getJsonInput();
            if (!$data || !isset($data['id'])) {
                echo json_encode(['status' => 'error', 'message' => 'Printer ID is required']);
                exit;
            }

            $id = (int)$data['id'];
            $print_counter = (int)($data['print_counter'] ?? 0);
            $toner_black = (int)($data['toner_black'] ?? 100);
            
            // Optional color toners
            $toner_cyan = isset($data['toner_cyan']) ? (int)$data['toner_cyan'] : null;
            $toner_magenta = isset($data['toner_magenta']) ? (int)$data['toner_magenta'] : null;
            $toner_yellow = isset($data['toner_yellow']) ? (int)$data['toner_yellow'] : null;

            if ($toner_cyan !== null && $toner_magenta !== null && $toner_yellow !== null) {
                // Update color printer
                $stmt = $conn->prepare("UPDATE printers SET print_counter = ?, toner_black = ?, toner_cyan = ?, toner_magenta = ?, toner_yellow = ? WHERE id = ?");
                $success = $stmt->execute([$print_counter, $toner_black, $toner_cyan, $toner_magenta, $toner_yellow, $id]);
            } else {
                // Update monochrome printer
                $stmt = $conn->prepare("UPDATE printers SET print_counter = ?, toner_black = ? WHERE id = ?");
                $success = $stmt->execute([$print_counter, $toner_black, $id]);
            }

            if ($success) {
                echo json_encode(['status' => 'success', 'message' => 'Printer updated successfully']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Failed to update printer']);
            }
            break;

        // 4. DELETE PRINTER
        case 'delete':
            $data = getJsonInput();
            if (!$data || !isset($data['id'])) {
                echo json_encode(['status' => 'error', 'message' => 'Printer ID is required']);
                exit;
            }

            $id = (int)$data['id'];

            $stmt = $conn->prepare("DELETE FROM printers WHERE id = ?");
            $success = $stmt->execute([$id]);

            if ($success) {
                echo json_encode(['status' => 'success', 'message' => 'Printer deleted successfully']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Failed to delete printer']);
            }
            break;

        default:
            echo json_encode(['status' => 'error', 'message' => 'Invalid or missing command action']);
            break;
    }
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Server Error: ' . $e->getMessage()]);
}
?>
