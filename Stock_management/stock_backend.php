<?php
/**
 * BACKEND: Stock Management
 * Location: Stock_management/stock_backend.php
 */

error_reporting(0); 
require_once '../config.php';
header('Content-Type: application/json');

if (isset($db_connection_error)) {
    echo json_encode(['status' => 'error', 'message' => 'Connection Error: ' . $db_connection_error]);
    exit;
}

try {
    // Ensure table exists
    $conn->exec("CREATE TABLE IF NOT EXISTS stocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        shortcut_name VARCHAR(100),
        buy_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        sell_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        stock_balance INT NOT NULL DEFAULT 0,
        alert_limit INT NOT NULL DEFAULT 10,
        qr_code TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    // Migration: Check if alert_limit column exists (for existing tables)
    $check_col = $conn->query("SHOW COLUMNS FROM `stocks` LIKE 'alert_limit'");
    if (!$check_col->fetch()) {
        $conn->exec("ALTER TABLE `stocks` ADD COLUMN `alert_limit` INT NOT NULL DEFAULT 10 AFTER `stock_balance` ");
    }
} catch(PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Init Failed: ' . $e->getMessage()]);
    exit;
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'fetch_stocks':
        try {
            $stmt = $conn->query("SELECT * FROM stocks ORDER BY id DESC");
            $stocks = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['status' => 'success', 'data' => $stocks]);
        } catch(PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;

    case 'save_stock':
        $id = $_POST['id'] ?? '';
        $name = $_POST['product_name'];
        $cat = $_POST['category'];
        $short = $_POST['shortcut_name'];
        $buy = $_POST['buy_price'];
        $sell = $_POST['sell_price'];
        $bal = $_POST['stock_balance'];
        $alert = $_POST['alert_limit'];
        $qr = $_POST['qr_code'];

        try {
            if ($id) {
                // UPDATE
                $stmt = $conn->prepare("UPDATE stocks SET product_name=?, category=?, shortcut_name=?, buy_price=?, sell_price=?, stock_balance=?, alert_limit=?, qr_code=? WHERE id=?");
                $stmt->execute([$name, $cat, $short, $buy, $sell, $bal, $alert, $qr, $id]);
                $msg = "Product updated!";
            } else {
                // INSERT
                $stmt = $conn->prepare("INSERT INTO stocks (product_name, category, shortcut_name, buy_price, sell_price, stock_balance, alert_limit, qr_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$name, $cat, $short, $buy, $sell, $bal, $alert, $qr]);
                $msg = "Product added successfully!";
            }
            echo json_encode(['status' => 'success', 'message' => $msg]);
        } catch(PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'Save failed: ' . $e->getMessage()]);
        }
        break;

    case 'delete_stock':
        $id = $_POST['id'];
        try {
            $stmt = $conn->prepare("DELETE FROM stocks WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success', 'message' => 'Product removed from inventory.']);
        } catch(PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'Delete failed: ' . $e->getMessage()]);
        }
        break;
}
?>
