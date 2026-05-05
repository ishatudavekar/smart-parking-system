-- Create the database
CREATE DATABASE IF NOT EXISTS smart_parking;
USE smart_parking;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- Slots table
CREATE TABLE IF NOT EXISTS slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status ENUM('available', 'occupied') DEFAULT 'available'
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_no VARCHAR(50) NOT NULL,
    slot_id INT NOT NULL,
    entry_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    exit_time DATETIME NULL,
    FOREIGN KEY (slot_id) REFERENCES slots(id)
);

-- Insert a default admin user (ignore if exists)
INSERT IGNORE INTO users (name, email, password) VALUES ('Admin', 'admin@example.com', 'password123');

-- Insert 10 parking slots only if slots table is empty
INSERT INTO slots (status)
SELECT 'available' FROM DUAL
WHERE NOT EXISTS (SELECT * FROM slots);
INSERT INTO slots (status)
SELECT 'available' FROM DUAL
WHERE (SELECT COUNT(*) FROM slots) = 1;
INSERT INTO slots (status)
SELECT 'available' FROM DUAL
WHERE (SELECT COUNT(*) FROM slots) = 2;
INSERT INTO slots (status)
SELECT 'available' FROM DUAL
WHERE (SELECT COUNT(*) FROM slots) = 3;
INSERT INTO slots (status)
SELECT 'available' FROM DUAL
WHERE (SELECT COUNT(*) FROM slots) = 4;
INSERT INTO slots (status)
SELECT 'available' FROM DUAL
WHERE (SELECT COUNT(*) FROM slots) = 5;
INSERT INTO slots (status)
SELECT 'available' FROM DUAL
WHERE (SELECT COUNT(*) FROM slots) = 6;
INSERT INTO slots (status)
SELECT 'available' FROM DUAL
WHERE (SELECT COUNT(*) FROM slots) = 7;
INSERT INTO slots (status)
SELECT 'available' FROM DUAL
WHERE (SELECT COUNT(*) FROM slots) = 8;
INSERT INTO slots (status)
SELECT 'available' FROM DUAL
WHERE (SELECT COUNT(*) FROM slots) = 9;
