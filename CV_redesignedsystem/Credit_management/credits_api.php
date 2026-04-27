<?php
/**
 * API: Credit Management
 * Handles historical credit data and summaries.
 */
header('Content-Type: application/json');
require_once '../config.php';

$action = $_GET['action'] ?? '';

if (isset($db_connection_error)) {
    echo json_encode(['status' => 'error', 'message' => 'Connection Error: ' . $db_connection_error]);
    exit;
}

try {
    if ($action === 'fetch_history') {
        $date = $_GET['date'] ?? '';
        $query = "
            SELECT c.*, s.stf_name as staff_name 
            FROM staff_credits c 
            JOIN staff s ON c.staff_id = s.stf_id
        ";
        $params = [];

        if (!empty($date)) {
            $query .= " WHERE c.date = ?";
            $params[] = $date;
        }

        $query .= " ORDER BY c.date DESC, c.created_at DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get Global Total
        $totalStmt = $conn->query("SELECT SUM(amount) as total FROM staff_credits");
        $summary = $totalStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'status' => 'success',
            'data' => $history,
            'total_outstanding' => $summary['total'] ?? 0
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid Action']);
    }
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
