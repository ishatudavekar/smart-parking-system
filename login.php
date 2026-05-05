<?php
session_start();

// Redirect to dashboard if already logged in
if(isset($_SESSION['user_id'])){
  header("Location: dashboard.php");
  exit();
}

include 'db.php';
$error = "";

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  $email = trim($_POST['email']);
  $password = trim($_POST['password']);

  if (!empty($email) && !empty($password)) {
    $stmt = $conn->prepare("SELECT id, name, password FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
      $user = $result->fetch_assoc();
      
      // Note: Assuming plain text passwords for simplicity. 
      // For production, use password_hash() and password_verify()
      if ($password === $user['password']) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['name'] = $user['name'];
        header("Location: dashboard.php");
        exit();
      } else {
        $error = "Invalid password.";
      }
    } else {
      $error = "No user found with that email.";
    }
  } else {
    $error = "Please fill in all fields.";
  }
}
?>

<!DOCTYPE html>
<html>
<head>
  <title>Login - Smart Parking</title>
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
      max-width: 350px;
      text-align: center;
      box-shadow: 0 0 30px rgba(14, 165, 233, 0.2);
    }

    h2 {
      margin-top: 0;
      margin-bottom: 30px;
      background: linear-gradient(45deg, #0ea5e9, #9333ea);
      -webkit-background-clip: text;
      color: transparent;
      font-size: 28px;
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

    input[type="email"], input[type="password"] {
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

    input[type="email"]:focus, input[type="password"]:focus {
      outline: none;
      border-color: #0ea5e9;
      box-shadow: 0 0 10px rgba(14, 165, 233, 0.3);
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
      background: linear-gradient(45deg, #0ea5e9, #9333ea);
      margin-top: 10px;
    }

    .btn:hover {
      transform: scale(1.02);
      box-shadow: 0 0 15px rgba(14, 165, 233, 0.4);
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
  </style>
</head>
<body>

<div class="container">
  <h2>Smart Parking</h2>

  <?php if ($error): ?>
    <div class="message error"><?php echo htmlspecialchars($error); ?></div>
  <?php endif; ?>

  <form method="POST" action="">
    <div class="form-group">
      <label for="email">Email Address</label>
      <input type="email" id="email" name="email" required placeholder="admin@example.com">
    </div>
    
    <div class="form-group">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required placeholder="••••••••">
    </div>

    <button type="submit" class="btn">Login</button>
  </form>
</div>

</body>
</html>
