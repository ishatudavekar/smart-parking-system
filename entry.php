<?php
session_start();

if(!isset($_SESSION['user_id'])){
  header("Location: login.php");
  exit();
}
include 'db.php';

$error = "";
$success = "";

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  $vehicle_no = trim($_POST['vehicle_no']);

  if (!empty($vehicle_no)) {
    // Check if vehicle is already parked
    $check_vehicle = $conn->prepare("SELECT id FROM vehicles WHERE vehicle_no = ? AND exit_time IS NULL");
    $check_vehicle->bind_param("s", $vehicle_no);
    $check_vehicle->execute();
    $result = $check_vehicle->get_result();
    
    if ($result->num_rows > 0) {
        $error = "This vehicle is already parked.";
    } else {
        // Find an available slot
        $slot_query = $conn->query("SELECT id FROM slots WHERE status='available' LIMIT 1");
        
        if ($slot_query->num_rows > 0) {
          $slot = $slot_query->fetch_assoc();
          $slot_id = $slot['id'];

          // Insert into vehicles table
          $insert = $conn->prepare("INSERT INTO vehicles (vehicle_no, slot_id, entry_time) VALUES (?, ?, NOW())");
          $insert->bind_param("si", $vehicle_no, $slot_id);
          
          if ($insert->execute()) {
            // Update slot status to occupied
            $update_slot = $conn->prepare("UPDATE slots SET status='occupied' WHERE id=?");
            $update_slot->bind_param("i", $slot_id);
            $update_slot->execute();

            $success = "Vehicle parked successfully in Slot $slot_id.";
          } else {
            $error = "Error adding vehicle. Please try again.";
          }
        } else {
          $error = "No available slots right now.";
        }
    }
  } else {
    $error = "Please enter a vehicle number.";
  }
}
?>

<!DOCTYPE html>
<html>
<head>
  <title>Add Vehicle - Smart Parking</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;500;600&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      font-family: 'Poppins', sans-serif;
      background: #000;
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }

    .container {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(15px);
      padding: 40px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.08);
      width: 100%;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.2);
    }

    h2 {
      margin-top: 0;
      margin-bottom: 20px;
      background: linear-gradient(45deg, #22c55e, #16a34a);
      -webkit-background-clip: text;
      color: transparent;
    }

    .form-group {
      margin-bottom: 20px;
      text-align: left;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      color: #ccc;
    }

    input[type="text"] {
      width: 100%;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(0,0,0,0.2);
      color: white;
      font-family: 'Poppins', sans-serif;
      box-sizing: border-box;
      transition: 0.3s;
    }

    input[type="text"]:focus {
      outline: none;
      border-color: #22c55e;
      box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
    }

    .btn {
      width: 100%;
      padding: 12px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      font-weight: 500;
      font-family: 'Poppins', sans-serif;
      font-size: 16px;
      transition: 0.3s;
      color: white;
      background: linear-gradient(45deg, #22c55e, #16a34a);
      margin-bottom: 15px;
    }

    .btn:hover {
      transform: scale(1.02);
      box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
    }

    .back-link {
      color: #0ea5e9;
      text-decoration: none;
      font-size: 14px;
      transition: 0.3s;
    }

    .back-link:hover {
      text-decoration: underline;
      text-shadow: 0 0 10px rgba(14, 165, 233, 0.5);
    }

    .message {
      padding: 10px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .message.error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
    }

    .message.success {
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #22c55e;
    }
  </style>
</head>
<body>

<div class="container">
  <h2>+ Add Vehicle</h2>

  <?php if ($error): ?>
    <div class="message error"><?php echo htmlspecialchars($error); ?></div>
  <?php endif; ?>

  <?php if ($success): ?>
    <div class="message success"><?php echo htmlspecialchars($success); ?></div>
  <?php endif; ?>

  <form method="POST" action="">
    <div class="form-group">
      <label for="vehicle_no">Vehicle Number</label>
      <input type="text" id="vehicle_no" name="vehicle_no" required placeholder="e.g. AB-12-CD-3456" autocomplete="off">
    </div>
    <button type="submit" class="btn">Park Vehicle</button>
  </form>

  <a href="dashboard.php" class="back-link">← Back to Dashboard</a>
</div>

</body>
</html>
