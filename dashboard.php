<?php
session_start();

if(!isset($_SESSION['user_id'])){
  header("Location: login.php");
  exit();
}
include 'db.php';

// Total slots
$total = $conn->query("SELECT COUNT(*) as total FROM slots")->fetch_assoc()['total'];

// Available slots
$available = $conn->query("SELECT COUNT(*) as available FROM slots WHERE status='available'")->fetch_assoc()['available'];

// Occupied slots
$occupied = $conn->query("SELECT COUNT(*) as occupied FROM slots WHERE status='occupied'")->fetch_assoc()['occupied'];

$vehicles = $conn->query("SELECT * FROM vehicles WHERE exit_time IS NULL");
?>

<!DOCTYPE html>
<html>
<head>
  <title>Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;500;600&display=swap" rel="stylesheet">

  <style>
    body {
      margin: 0;
      font-family: 'Poppins', sans-serif;
      background: #000;
      color: white;
    }

    /* Navbar */
    .navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 30px;
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .navbar h2 {
      margin: 0;
      background: linear-gradient(45deg, #0ea5e9, #9333ea);
      -webkit-background-clip: text;
      color: transparent;
    }

    .user {
      font-size: 14px;
    }

    .logout {
      color: #f87171;
      text-decoration: none;
      margin-left: 10px;
    }

    /* Container */
    .container {
      padding: 30px;
    }

    h1 {
      margin-bottom: 20px;
    }

    /* Cards */
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
    }

    .card {
      padding: 25px;
      border-radius: 20px;
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(15px);
      text-align: center;
      transition: 0.3s;
      border: 1px solid rgba(255,255,255,0.08);
    }

    .card:hover {
      transform: translateY(-5px) scale(1.02);
      box-shadow: 0 0 20px rgba(14,165,233,0.4);
    }

    .card h3 {
      margin-bottom: 10px;
      font-weight: 500;
    }

    .card p {
      font-size: 28px;
      font-weight: bold;
    }

    /* Glow colors */
    .blue { box-shadow: 0 0 10px #0ea5e9; }
    .green { box-shadow: 0 0 10px #22c55e; }
    .red { box-shadow: 0 0 10px #ef4444; }

    /* Action buttons */
    .actions {
      margin-top: 30px;
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 12px 20px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      font-weight: 500;
      transition: 0.3s;
      text-decoration: none;
      color: white;
    }

    .btn-entry {
      background: linear-gradient(45deg, #22c55e, #16a34a);
    }

    .btn-exit {
      background: linear-gradient(45deg, #ef4444, #dc2626);
    }

    .btn:hover {
      transform: scale(1.05);
      box-shadow: 0 0 15px rgba(255,255,255,0.2);
    }
    tr:hover {
  background: rgba(255,255,255,0.05);
}

  </style>
</head>

<body>

<div class="navbar">
  <h2>🚗 Smart Parking</h2>
  <div class="user">
    Welcome, <?php echo $_SESSION['name']; ?>
    <a href="logout.php" class="logout">Logout</a>
  </div>
</div>

<div class="container">
  <h1>Dashboard</h1>

  <div class="cards">
    <div class="card blue">
      <h3>Total Slots</h3>
      <p><?php echo $total; ?></p>
    </div>

    <div class="card green">
      <h3>Available</h3>
      <p><?php echo $available; ?></p>
    </div>

    <div class="card red">
      <h3>Occupied</h3>
      <p><?php echo $occupied; ?></p>
    </div>
  </div>

  <h2 style="margin-top:40px;">🚗 Parked Vehicles</h2>

<table style="width:100%; margin-top:15px; border-collapse: collapse;">
  <tr style="background: rgba(255,255,255,0.1);">
    <th style="padding:10px;">Vehicle No</th>
    <th style="padding:10px;">Slot</th>
    <th style="padding:10px;">Entry Time</th>
  </tr>

  <?php while($row = $vehicles->fetch_assoc()){ ?>
    <tr style="text-align:center; border-bottom:1px solid rgba(255,255,255,0.1);">
      <td style="padding:10px;"><?php echo $row['vehicle_no']; ?></td>
      <td><?php echo $row['slot_id']; ?></td>
      <td><?php echo $row['entry_time']; ?></td>
    </tr>
  <?php } ?>

</table>

  <div class="actions">
    <a href="entry.php" class="btn btn-entry">+ Add Vehicle</a>
    <a href="exit.php" class="btn btn-exit">- Exit Vehicle</a>
  </div>
</div>

</body>
</html>
