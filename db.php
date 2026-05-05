<?php
$host = "localhost";
$user = "root";       // Change this to your database username (e.g., root)
$pass = "";           // Change this to your database password
$dbname = "smart_parking"; // Change this to your database name

// Create connection
$conn = new mysqli($host, $user, $pass, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Database Connection failed: " . $conn->connect_error);
}
?>
