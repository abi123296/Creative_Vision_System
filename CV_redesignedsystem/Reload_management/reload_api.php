<?php
/**
 * API: Reload & Card Management
 * PURPOSE: Securely handle inventory updates and fetches.
 */
header('Content-Type: application/json');
require_once '../config.php';

// Check if database connection exists
if (isset($db_connection_error)) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $db_connection_error]);
    exit;
}

// ---------------------------------------------------------
// AUTO-INITIALIZE TABLES (If not exists)
// ---------------------------------------------------------
try {
    // 1. Balances Table
    $conn->exec("CREATE TABLE IF NOT EXISTS reload_balances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        network_name VARCHAR(50) UNIQUE NOT NULL,
        balance DECIMAL(15, 2) DEFAULT 0.00,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    // 2. Card Stock Table
    $conn->exec("CREATE TABLE IF NOT EXISTS card_stock (
        id INT AUTO_INCREMENT PRIMARY KEY,
        network_name VARCHAR(50) NOT NULL,
        denomination INT NOT NULL,
        quantity INT DEFAULT 0,
        UNIQUE KEY network_denom (network_name, denomination),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    // Pre-populate if empty (First time setup)
    $stmt = $conn->query("SELECT COUNT(*) FROM reload_balances");
    if ($stmt->fetchColumn() == 0) {
        $networks = ['Dialog', 'Mobitel', 'Airtel', 'Hutch', 'EzCash'];
        foreach ($networks as $net) {
            $conn->prepare("INSERT INTO reload_balances (network_name, balance) VALUES (?, 0.00)")->execute([$net]);
        }
    }
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Table init failed: ' . $e->getMessage()]);
    exit;
}

// ---------------------------------------------------------
// HANDLE ACTIONS
// ---------------------------------------------------------
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($action === 'fetch_inventory') {
    try {
        $balances = $conn->query("SELECT network_name, balance FROM reload_balances")->fetchAll(PDO::FETCH_ASSOC);
        $cards = $conn->query("SELECT network_name, denomination, quantity FROM card_stock")->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'status' => 'success',
            'balances' => $balances,
            'cards' => $cards
        ]);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} 

elseif ($action === 'save_inventory') {
    try {
        $conn->beginTransaction();

        // 1. Save Balances
        $balances = json_decode($_POST['balances'], true);
        if ($balances) {
            $stmt = $conn->prepare("UPDATE reload_balances SET balance = ? WHERE network_name = ?");
            foreach ($balances as $net => $val) {
                // Map frontend IDs to DB names
                $dbName = ucfirst(str_replace('Balance', '', $net));
                if($net === 'ezcashBalance') $dbName = 'EzCash';
                $stmt->execute([$val, $dbName]);
            }
        }

        // 2. Save Card Stocks
        $cards = json_decode($_POST['cards'], true);
        if ($cards) {
            $stmt = $conn->prepare("INSERT INTO card_stock (network_name, denomination, quantity) 
                                    VALUES (?, ?, ?) 
                                    ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)");
            foreach ($cards as $c) {
                $stmt->execute([$c['network'], $c['value'], $c['quantity']]);
            }
        }

        $conn->commit();
        echo json_encode(['status' => 'success', 'message' => 'Inventory updated successfully']);
    } catch (PDOException $e) {
        $conn->rollBack();
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
}
?>
