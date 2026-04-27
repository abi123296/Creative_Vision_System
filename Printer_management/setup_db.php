<?php
require_once '../config.php';

try {
    $sql = "
    CREATE TABLE IF NOT EXISTS printers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(255) DEFAULT 'Network Printer',
        ip_address VARCHAR(100),
        image_url VARCHAR(500) DEFAULT '',
        status VARCHAR(50) DEFAULT 'Active',
        print_counter INT DEFAULT 0,
        is_color TINYINT(1) DEFAULT 0,
        toner_black INT DEFAULT 100,
        toner_cyan INT DEFAULT 100,
        toner_magenta INT DEFAULT 100,
        toner_yellow INT DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ";

    $conn->exec($sql);
    echo "SQL Executed Successfully! Initializing dummy data...<br>";

    // Insert dummy data if empty
    $check = $conn->query("SELECT COUNT(*) FROM printers")->fetchColumn();
    if ($check == 0) {
        $insert = "INSERT INTO printers (name, type, ip_address, image_url, status, print_counter, is_color, toner_black, toner_cyan, toner_magenta, toner_yellow) VALUES 
        ('Canon G3000', 'Color Laser', '192.168.1.12', 'https://via.placeholder.com/300x150?text=Canon+G3000', 'Active', 15400, 1, 25, 75, 50, 100),
        ('HP LaserJet Pro', 'Monochrome USB', 'USB Local', 'https://via.placeholder.com/300x150?text=HP+LaserJet', 'Active', 82105, 0, 100, 0, 0, 0)";
        
        $conn->exec($insert);
        echo "Dummy printers seeded!<br>";
    } else {
        echo "Printers table already has data.<br>";
    }

} catch (PDOException $e) {
    echo "Creation Failed: " . $e->getMessage();
}
?>
