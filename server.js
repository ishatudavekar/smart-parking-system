const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database('./smart_parking.db');

// Setup Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'smart_parking_secret',
    resave: false,
    saveUninitialized: false
}));

// Initialize Database
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT DEFAULT 'available'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_no TEXT NOT NULL,
        slot_id INTEGER NOT NULL,
        entry_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        exit_time DATETIME NULL,
        FOREIGN KEY (slot_id) REFERENCES slots(id)
    )`);

    // Insert default admin
    db.run(`INSERT OR IGNORE INTO users (name, email, password) VALUES ('Admin', 'admin@example.com', 'password123')`);

    // Insert 10 slots if not exists
    db.get("SELECT COUNT(*) AS count FROM slots", (err, row) => {
        if (row && row.count === 0) {
            const stmt = db.prepare("INSERT INTO slots (status) VALUES ('available')");
            for (let i = 0; i < 10; i++) {
                stmt.run();
            }
            stmt.finalize();
        }
    });
});

// Auth Middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

// Routes
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// Login
app.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err || !user || user.password !== password) {
            return res.render('login', { error: 'Invalid email or password.' });
        }
        req.session.userId = user.id;
        req.session.name = user.name;
        res.redirect('/dashboard');
    });
});

// Register
app.get('/register', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('register', { error: null });
});

app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.render('register', { error: 'Please fill in all fields.' });
    }

    // Insert user into database
    db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [name, email, password], function(err) {
        if (err) {
            // Error code 19 usually means UNIQUE constraint failed in SQLite
            return res.render('register', { error: 'Email already exists. Try logging in.' });
        }
        
        // Auto-login after registration
        req.session.userId = this.lastID;
        req.session.name = name;
        res.redirect('/dashboard');
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Dashboard
app.get('/dashboard', requireAuth, (req, res) => {
    db.get("SELECT COUNT(*) as total FROM slots", (err, totalRow) => {
        db.get("SELECT COUNT(*) as available FROM slots WHERE status='available'", (err, availRow) => {
            db.get("SELECT COUNT(*) as occupied FROM slots WHERE status='occupied'", (err, occRow) => {
                db.all("SELECT * FROM vehicles WHERE exit_time IS NULL", (err, vehicles) => {
                    res.render('dashboard', {
                        name: req.session.name,
                        total: totalRow.total,
                        available: availRow.available,
                        occupied: occRow.occupied,
                        vehicles: vehicles
                    });
                });
            });
        });
    });
});

// Entry
app.get('/entry', requireAuth, (req, res) => {
    res.render('entry', { error: null, success: null });
});

app.post('/entry', requireAuth, (req, res) => {
    const vehicle_no = req.body.vehicle_no.trim();
    if (!vehicle_no) return res.render('entry', { error: 'Vehicle number required.', success: null });

    db.get("SELECT id FROM vehicles WHERE vehicle_no = ? AND exit_time IS NULL", [vehicle_no], (err, row) => {
        if (row) {
            return res.render('entry', { error: 'Vehicle already parked.', success: null });
        }
        
        db.get("SELECT id FROM slots WHERE status='available' LIMIT 1", (err, slot) => {
            if (!slot) return res.render('entry', { error: 'No available slots.', success: null });
            
            db.run("INSERT INTO vehicles (vehicle_no, slot_id) VALUES (?, ?)", [vehicle_no, slot.id], function(err) {
                if (err) return res.render('entry', { error: 'Error adding vehicle.', success: null });
                
                db.run("UPDATE slots SET status='occupied' WHERE id=?", [slot.id], (err) => {
                    res.render('entry', { error: null, success: `Vehicle parked successfully in Slot ${slot.id}.` });
                });
            });
        });
    });
});

// Exit
app.get('/exit', requireAuth, (req, res) => {
    res.render('exit', { error: null, success: null });
});

app.post('/exit', requireAuth, (req, res) => {
    const vehicle_no = req.body.vehicle_no.trim();
    if (!vehicle_no) return res.render('exit', { error: 'Vehicle number required.', success: null });

    db.get("SELECT id, slot_id FROM vehicles WHERE vehicle_no = ? AND exit_time IS NULL", [vehicle_no], (err, vehicle) => {
        if (!vehicle) return res.render('exit', { error: 'Vehicle not found or already exited.', success: null });

        db.run("UPDATE vehicles SET exit_time = CURRENT_TIMESTAMP WHERE id = ?", [vehicle.id], (err) => {
            if (err) return res.render('exit', { error: 'Error updating exit time.', success: null });

            db.run("UPDATE slots SET status='available' WHERE id=?", [vehicle.slot_id], (err) => {
                res.render('exit', { error: null, success: `Vehicle exited successfully. Slot ${vehicle.slot_id} is free.` });
            });
        });
    });
});

const PORT = process.env.PORT || 3004;
const server = app.listen(PORT, () => {
    console.log(`Smart Parking running on http://localhost:${PORT}`);
});

module.exports = app;
server.on('error', (e) => {
    console.error('Server error:', e);
});
