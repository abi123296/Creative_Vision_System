<?php
/**
 * API: POS Management
 * Location: POS_system/pos_api.php
 */

error_reporting(0);
require_once '../config.php';
header('Content-Type: application/json');

if (isset($db_connection_error)) {
    echo json_encode(['status' => 'error', 'message' => 'Connection Error: ' . $db_connection_error]);
    exit;
}

// ---------------------------------------------------------
// AUTO-INITIALIZE TABLES
// ---------------------------------------------------------
try {
    // 1. Sales Table
    $conn->exec("CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(255) DEFAULT 'Walking Customer',
        total_amount DECIMAL(15, 2) NOT NULL,
        discount DECIMAL(15, 2) DEFAULT 0.00,
        payable_amount DECIMAL(15, 2) NOT NULL,
        payment_method ENUM('Cash', 'Card', 'Online') DEFAULT 'Cash',
        staff_id INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // 2. Sale Items Table
    $conn->exec("CREATE TABLE IF NOT EXISTS sale_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT NOT NULL,
        item_type ENUM('Accessory', 'Reload', 'Card') NOT NULL,
        item_id INT NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(15, 2) NOT NULL,
        subtotal DECIMAL(15, 2) NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )");
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Init Failed: ' . $e->getMessage()]);
    exit;
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'get_products':
        try {
            // Get Accessories
            $stmt = $conn->query("SELECT id, name, category, sell_price as price, stock, image_path, barcode FROM accessories WHERE stock > 0 ORDER BY name ASC");
            $accessories = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get Reload Balances (as virtual products)
            $stmt = $conn->query("SELECT network_name as name, balance as stock FROM reload_balances");
            $reloads = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get Card Stocks
            $stmt = $conn->query("SELECT id, network_name, denomination, quantity as stock FROM card_stock WHERE quantity > 0");
            $cards = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'status' => 'success',
                'accessories' => $accessories,
                'reloads' => $reloads,
                'cards' => $cards
            ]);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;

    case 'process_sale':
        try {
            $conn->beginTransaction();

            $customer = $_POST['customer_name'] ?? 'Walking Customer';
            $total = $_POST['total_amount'];
            $discount = $_POST['discount'] ?? 0;
            $payable = $_POST['payable_amount'];
            $method = $_POST['payment_method'] ?? 'Cash';
            $items = json_decode($_POST['items'], true);
            $staff_id = $_POST['staff_id'] ?? 0;

            // 1. Insert into sales
            $stmt = $conn->prepare("INSERT INTO sales (customer_name, total_amount, discount, payable_amount, payment_method, staff_id) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$customer, $total, $discount, $payable, $method, $staff_id]);
            $sale_id = $conn->lastInsertId();

            // 2. Insert items and update stock
            foreach ($items as $item) {
                $stmt = $conn->prepare("INSERT INTO sale_items (sale_id, item_type, item_id, item_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $sale_id,
                    $item['type'],
                    $item['id'],
                    $item['name'],
                    $item['quantity'],
                    $item['price'],
                    $item['subtotal']
                ]);

                // 3. Update Stock
                if ($item['type'] === 'Accessory') {
                    $upd = $conn->prepare("UPDATE accessories SET stock = stock - ? WHERE id = ?");
                    $upd->execute([$item['quantity'], $item['id']]);
                } elseif ($item['type'] === 'Reload') {
                    // For reloads, we subtract from balance
                    $upd = $conn->prepare("UPDATE reload_balances SET balance = balance - ? WHERE network_name = ?");
                    $upd->execute([$item['subtotal'], $item['id']]); // item_id here is network name
                } elseif ($item['type'] === 'Card') {
                    $upd = $conn->prepare("UPDATE card_stock SET quantity = quantity - ? WHERE id = ?");
                    $upd->execute([$item['quantity'], $item['id']]);
                }
            }

            $conn->commit();
            echo json_encode(['status' => 'success', 'message' => 'Sale processed successfully', 'sale_id' => $sale_id]);
        } catch (PDOException $e) {
            $conn->rollBack();
            echo json_encode(['status' => 'error', 'message' => 'Transaction failed: ' . $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
        break;
}
