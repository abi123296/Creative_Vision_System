<?php
// ============================================
// ATTENDANCE API FOR REDESIGNED SYSTEM
// ============================================
date_default_timezone_set('Asia/Colombo');
require_once '../config.php';
header('Content-Type: application/json');

if (isset($db_connection_error)) {
    echo json_encode(['status' => 'error', 'message' => 'Connection Error: ' . $db_connection_error]);
    exit;
}

try {
    $db_name = 'cv_redesingned';
    $conn->exec("USE `$db_name`");
    
    // Create attendance_log table
    $conn->exec("CREATE TABLE IF NOT EXISTS attendance_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        staff_id VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        check_in TIME,
        check_out TIME,
        hours DECIMAL(5,2) DEFAULT 0,
        total_salary DECIMAL(10,2) DEFAULT 0
    )");

    // 1. Create table if it doesn't exist
    $conn->exec("CREATE TABLE IF NOT EXISTS staff_credits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        staff_id VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        reason VARCHAR(255),
        given_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // 2. Add columns if they were missing from previous versions
    try { $conn->exec("ALTER TABLE staff_credits ADD COLUMN reason VARCHAR(255) AFTER amount"); } catch(Exception $e) {}
    try { $conn->exec("ALTER TABLE staff_credits ADD COLUMN given_by VARCHAR(100) AFTER reason"); } catch(Exception $e) {}
    try { $conn->exec("ALTER TABLE staff_credits ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER given_by"); } catch(Exception $e) {}
} catch(PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database Initialization Failed']);
    exit;
}

$action = $_GET['action'] ?? '';

if ($action === 'scan') {
    $staff_id = $_POST['staff_id'] ?? '';
    if (empty($staff_id)) {
        echo json_encode(['status' => 'error', 'message' => 'Empty scan result']);
        exit;
    }

    // 1. Verify Staff Registration (Using TRIM and LIKE for maximum flexibility)
    $stmt = $conn->prepare("SELECT stf_name, stf_salary FROM staff WHERE TRIM(stf_id) = ? OR ? LIKE CONCAT('%', TRIM(stf_id), '%')");
    $stmt->execute([trim($staff_id), trim($staff_id)]);
    $staff = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$staff) {
        echo json_encode(['status' => 'error', 'message' => "Staff not registered!\n(System saw: " . htmlspecialchars($staff_id) . ")"]);
        exit;
    }

    $today = date('Y-m-d');
    $time_now = date('H:i:s');
    
    // 2. Determine Odd vs Even Scan
    // We check for an open session (check_out is null) for this staff today
    $stmt = $conn->prepare("SELECT * FROM attendance_log WHERE staff_id = ? AND date = ? AND check_out IS NULL ORDER BY id DESC LIMIT 1");
    $stmt->execute([$staff_id, $today]);
    $open_session = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$open_session) {
        // Odd Scan (Check-In) - No open session found
        $stmt = $conn->prepare("INSERT INTO attendance_log (staff_id, date, check_in) VALUES (?, ?, ?)");
        $stmt->execute([$staff_id, $today, $time_now]);
        echo json_encode(['status' => 'success', 'message' => 'Checked In: ' . $staff['stf_name'] . ' at ' . $time_now]);
    } else {
        // Even Scan (Check-Out) - Found an open session
        $check_in_time = strtotime($open_session['check_in']);
        $check_out_time = strtotime($time_now);
        $hours = ($check_out_time - $check_in_time) / 3600; 
        $hours = round($hours, 2);
        
        // Ensure negative hours (if scan order is weird) are handled
        if($hours < 0) $hours = 0;

        $salary_total = round($hours * $staff['stf_salary'], 2);

        $stmt = $conn->prepare("UPDATE attendance_log SET check_out = ?, hours = ?, total_salary = ? WHERE id = ?");
        $stmt->execute([$time_now, $hours, $salary_total, $open_session['id']]);
        
        echo json_encode([
            'status' => 'success', 
            'message' => "Checked Out: " . $staff['stf_name'] . "\nTime: $time_now\nHours: $hours\nSalary: Rs. $salary_total"
        ]);
    }
}
elseif ($action === 'get') {
    $today = date('Y-m-d');
    
    // Fetch sessions for today
    $stmt = $conn->prepare("
        SELECT a.*, s.stf_name as name, s.stf_role as role, s.stf_salary as salary_per_hour
        FROM attendance_log a
        JOIN staff s ON a.staff_id = s.stf_id
        WHERE a.date = ?
        ORDER BY a.id ASC
    ");
    $stmt->execute([$today]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch all credits for today to distribute them chronologically
    $stmt = $conn->prepare("SELECT * FROM staff_credits WHERE date = ? ORDER BY created_at ASC");
    $stmt->execute([$today]);
    $all_credits = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $summary = [
        'total_hours' => 0,
        'total_salary' => 0,
        'total_credit' => 0,
        'total_balance' => 0
    ];

    // CARRY-FORWARD TRACKING
    $staff_last_balance = [];

    foreach ($rows as &$row) {
        $sid = $row['staff_id'];
        $salary_per_hour = (float)$row['salary_per_hour'];
        
        // 1. Calculate Session-Specific Salary
        if (is_null($row['check_out'])) {
            $check_in_time = strtotime($row['check_in']);
            $current_time = time();
            $hours = ($current_time - $check_in_time) / 3600;
            $row['hours'] = round($hours, 2);
            $row['total_salary'] = round($row['hours'] * $salary_per_hour, 2);
        }
        // $row['total_salary'] is already the session salary (not accumulated)

        // 2. Map Credits to this Session ONLY
        // Logic: Credits belong to this session if taken before its checkout 
        // AND after the previous session's checkout.
        if (!isset($staff_last_balance[$sid])) $staff_last_balance[$sid] = 0;
        
        // Determine the time window for this session's credits
        // We use a small hack: we'll track the 'last_processed_time' for credits per staff
        if (!isset($credit_watermark[$sid])) $credit_watermark[$sid] = '00:00:00';
        
        $session_end_time = $row['check_out'] ? $row['check_out'] : date('H:i:s');
        
        $session_credits = 0;
        foreach ($all_credits as $c) {
            // Extract time from created_at (H:i:s)
            $c_time = date('H:i:s', strtotime($c['created_at']));
            if ($c['staff_id'] === $sid) {
                // If credit falls in this session's window
                if ($c_time <= $session_end_time && $c_time > $credit_watermark[$sid]) {
                    $session_credits += (float)$c['amount'];
                }
            }
        }
        
        $row['credit'] = $session_credits;
        $credit_watermark[$sid] = $session_end_time; // Move the window for the next session

        // 3. Calculate Carry-Forward Net Balance
        // Balance = (Previous Balance + This Session Salary - This Session Credit)
        $row['balance'] = round($staff_last_balance[$sid] + $row['total_salary'] - $row['credit'], 2);
        
        // Update the carry-forward balance for the next session
        $staff_last_balance[$sid] = $row['balance'];
        
        $summary['total_hours'] += $row['hours'];
        $summary['total_salary'] += $row['total_salary'];
    }
    
    // Summary total credit remains the total of all credits for the day
    foreach($all_credits as $c) {
        $summary['total_credit'] += (float)$c['amount'];
    }
    
    // Sort rows for display: Newest Session at Top
    usort($rows, function($a, $b) { return $b['id'] - $a['id']; });
    
    $summary['total_balance'] = round($summary['total_salary'] - $summary['total_credit'], 2);
    
    echo json_encode(['status' => 'success', 'rows' => $rows, 'summary' => $summary]);
}
elseif ($action === 'credit') {
    // Process add/deduct credits 
    $staff_id = $_POST['staff_id'] ?? '';
    $amount = (float)($_POST['amount'] ?? 0);
    $reason = $_POST['reason'] ?? 'Manual Update';
    $given_by = $_POST['given_by'] ?? 'Admin';
    $today = date('Y-m-d');
    
    if ($staff_id && $amount != 0) {
        $stmt = $conn->prepare("INSERT INTO staff_credits (staff_id, date, amount, reason, given_by) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$staff_id, $today, $amount, $reason, $given_by]);
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid credit push.']);
    }
}
elseif ($action === 'link_qr') {
    $target_id = (int)($_POST['staff_db_id'] ?? 0);
    $new_qr_code = $_POST['new_qr_code'] ?? '';

    if ($target_id > 0 && !empty($new_qr_code)) {
        // Update the stf_id for the selected staff member
        $stmt = $conn->prepare("UPDATE staff SET stf_id = ? WHERE id = ?");
        if($stmt->execute([$new_qr_code, $target_id])) {
            echo json_encode(['status' => 'success', 'message' => 'QR Code linked successfully!']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Update failed.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Incomplete data for linking.']);
    }
}
elseif ($action === 'get_credits_today') {
    // Fetch today's credits with staff names for the audit log
    $today = date('Y-m-d');
    $stmt = $conn->prepare("
        SELECT c.*, s.stf_name as name,
        (SELECT SUM(amount) FROM staff_credits WHERE staff_id = c.staff_id) as lifetime_total
        FROM staff_credits c 
        JOIN staff s ON c.staff_id = s.stf_id 
        WHERE c.date = ? 
        ORDER BY c.created_at DESC
    ");
    $stmt->execute([$today]);
    echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}
else {
    echo json_encode(['status' => 'error', 'message' => 'No action specified.']);
}
?>
