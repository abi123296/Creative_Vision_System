<?php
/**
 * BACKEND: Accessories Management API
 * Location: Acessories_dashboard/accessories_api.php
 */

error_reporting(0);
require_once '../config.php';
header('Content-Type: application/json');

if (isset($db_connection_error)) {
    echo json_encode(['status' => 'error', 'message' => 'Connection Error: ' . $db_connection_error]);
    exit;
}

try {
    // Ensure table exists (mapped to the fields from the user's HTML)
    $conn->exec("CREATE TABLE IF NOT EXISTS accessories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        short_name VARCHAR(100),
        buy_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        stock INT NOT NULL DEFAULT 0,
        alert_limit INT NOT NULL DEFAULT 5,
        barcode TEXT,
        image_path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");
} catch(PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Init Failed: ' . $e->getMessage()]);
    exit;
}

try {
    $check_col = $conn->query("SHOW COLUMNS FROM `accessories` LIKE 'alert_limit'");
    if (!$check_col->fetch()) {
        $conn->exec("ALTER TABLE `accessories` ADD COLUMN `alert_limit` INT NOT NULL DEFAULT 5 AFTER `stock` ");
    }
} catch(PDOException $e) {}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'get_products':
        try {
            $stmt = $conn->query("SELECT * FROM accessories ORDER BY id DESC");
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch(PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;

    case 'save_acc':
        $id = $_POST['id'] ?? '';
        $name = $_POST['name'];
        $cat = $_POST['category'];
        $short = $_POST['short_name'];
        $buy = $_POST['buy_price'];
        $sell = $_POST['sell_price'];
        $stock = $_POST['stock'];
        $alert = $_POST['alert_limit'] ?? 5;
        $barcode = $_POST['barcode'];
        
        // 1. Process Image Upload
        $imagePath = "";
        $image_update_sql = "";
        $image_update_param = [];
        
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = '../assets/images/accessories/';
            if(!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            $fileName = time() . '_' . basename($_FILES['image']['name']);
            $targetPath = $uploadDir . $fileName;
            
            if (move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
                $imagePath = $targetPath;
                $image_update_sql = ", image_path=?";
                $image_update_param = [$imagePath];
            }
        }

        try {
            if ($id) {
                // UPDATE
                if ($imagePath !== "") {
                    $stmt = $conn->prepare("UPDATE accessories SET name=?, category=?, short_name=?, buy_price=?, sell_price=?, stock=?, alert_limit=?, barcode=?, image_path=? WHERE id=?");
                    $stmt->execute([$name, $cat, $short, $buy, $sell, $stock, $alert, $barcode, $imagePath, $id]);
                } else {
                    $stmt = $conn->prepare("UPDATE accessories SET name=?, category=?, short_name=?, buy_price=?, sell_price=?, stock=?, alert_limit=?, barcode=? WHERE id=?");
                    $stmt->execute([$name, $cat, $short, $buy, $sell, $stock, $alert, $barcode, $id]);
                }
                $msg = "Accessory updated successfully!";
            } else {
                // INSERT
                $stmt = $conn->prepare("INSERT INTO accessories (name, category, short_name, buy_price, sell_price, stock, alert_limit, barcode, image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$name, $cat, $short, $buy, $sell, $stock, $alert, $barcode, $imagePath]);
                $msg = "Accessory added successfully!";
            }
            echo json_encode(['status' => 'success', 'message' => $msg]);
        } catch(PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'Save failed: ' . $e->getMessage()]);
        }
        break;

    case 'delete_product':
        $id = $_POST['id'] ?? $_GET['id'];
        try {
            $stmt = $conn->prepare("DELETE FROM accessories WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success', 'message' => 'Accessory removed from stock.']);
        } catch(PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'Delete failed: ' . $e->getMessage()]);
        }
        break;
        
    case 'update_stock':
        $id = $_POST['id'] ?? $_GET['id'];
        $stock = $_POST['stock'] ?? $_GET['stock'];
        try {
            $stmt = $conn->prepare("UPDATE accessories SET stock=? WHERE id=?");
            $stmt->execute([$stock, $id]);
            echo json_encode(['status' => 'success', 'message' => 'Stock amount updated!']);
        } catch(PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'Update failed: ' . $e->getMessage()]);
        }
        break;
}
?>
