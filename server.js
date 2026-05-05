const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');

const app = express();

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.POSTGRES_URL ? { rejectUnauthorized: false } : false
});

// Setup Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'smart_parking_secret',
    resave: false,
    saveUninitialized: false
}));

// Initialize Database
const initDb = async () => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS slots (
            id SERIAL PRIMARY KEY,
            status TEXT DEFAULT 'available'
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS vehicles (
            id SERIAL PRIMARY KEY,
            vehicle_no TEXT NOT NULL,
            slot_id INTEGER NOT NULL REFERENCES slots(id),
            entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            exit_time TIMESTAMP NULL
        )`);

        // Insert default admin
        await pool.query(`INSERT INTO users (name, email, password) VALUES ('Admin', 'admin@example.com', 'password123') ON CONFLICT (email) DO NOTHING`);

        // Insert 10 slots if not exists
        const { rows } = await pool.query("SELECT COUNT(*) AS count FROM slots");
        if (rows[0] && parseInt(rows[0].count) === 0) {
            for (let i = 0; i < 10; i++) {
                await pool.query("INSERT INTO slots (status) VALUES ('available')");
            }
        }
        console.log("Database initialized");
    } catch (err) {
        console.error("Database initialization error:", err);
    }
};

// Initialize DB if we have a connection string locally
if (process.env.POSTGRES_URL && process.env.NODE_ENV !== 'production') {
    initDb();
} else {
    console.warn("WARNING: POSTGRES_URL environment variable is not set. Database not initialized.");
}

app.get('/setup', async (req, res) => {
    await initDb();
    res.send("Database initialized successfully! You can now go to /login.");
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

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
        const user = rows[0];
        
        if (!user || user.password !== password) {
            return res.render('login', { error: 'Invalid email or password.' });
        }
        req.session.userId = user.id;
        req.session.name = user.name;
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Server error' });
    }
});

// Register
app.get('/register', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.render('register', { error: 'Please fill in all fields.' });
        }

        const { rows } = await pool.query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id`, [name, email, password]);
        
        req.session.userId = rows[0].id;
        req.session.name = name;
        res.redirect('/dashboard');
    } catch (err) {
        if (err.code === '23505') { // UNIQUE constraint violation
            return res.render('register', { error: 'Email already exists. Try logging in.' });
        }
        console.error(err);
        res.render('register', { error: 'Server error' });
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Dashboard
app.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const totalRes = await pool.query("SELECT COUNT(*) as total FROM slots");
        const availRes = await pool.query("SELECT COUNT(*) as available FROM slots WHERE status='available'");
        const occRes = await pool.query("SELECT COUNT(*) as occupied FROM slots WHERE status='occupied'");
        const { rows: vehicles } = await pool.query("SELECT * FROM vehicles WHERE exit_time IS NULL");

        res.render('dashboard', {
            name: req.session.name,
            total: totalRes.rows[0].total,
            available: availRes.rows[0].available,
            occupied: occRes.rows[0].occupied,
            vehicles: vehicles
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading dashboard");
    }
});

// Entry
app.get('/entry', requireAuth, (req, res) => {
    res.render('entry', { error: null, success: null });
});

app.post('/entry', requireAuth, async (req, res) => {
    try {
        const vehicle_no = req.body.vehicle_no.trim();
        if (!vehicle_no) return res.render('entry', { error: 'Vehicle number required.', success: null });

        const vehicleRes = await pool.query("SELECT id FROM vehicles WHERE vehicle_no = $1 AND exit_time IS NULL", [vehicle_no]);
        if (vehicleRes.rows.length > 0) {
            return res.render('entry', { error: 'Vehicle already parked.', success: null });
        }
        
        const slotRes = await pool.query("SELECT id FROM slots WHERE status='available' LIMIT 1");
        if (slotRes.rows.length === 0) {
            return res.render('entry', { error: 'No available slots.', success: null });
        }
        const slot = slotRes.rows[0];
        
        await pool.query("INSERT INTO vehicles (vehicle_no, slot_id) VALUES ($1, $2)", [vehicle_no, slot.id]);
        await pool.query("UPDATE slots SET status='occupied' WHERE id=$1", [slot.id]);
        
        res.render('entry', { error: null, success: `Vehicle parked successfully in Slot ${slot.id}.` });
    } catch (err) {
        console.error(err);
        res.render('entry', { error: 'Server error.', success: null });
    }
});

// Exit
app.get('/exit', requireAuth, (req, res) => {
    res.render('exit', { error: null, success: null, receipt: null });
});

app.post('/exit', requireAuth, async (req, res) => {
    try {
        const vehicle_no = req.body.vehicle_no.trim();
        if (!vehicle_no) return res.render('exit', { error: 'Vehicle number required.', success: null, receipt: null });

        const vehicleRes = await pool.query("SELECT id, slot_id, entry_time FROM vehicles WHERE vehicle_no = $1 AND exit_time IS NULL", [vehicle_no]);
        if (vehicleRes.rows.length === 0) {
            return res.render('exit', { error: 'Vehicle not found or already exited.', success: null, receipt: null });
        }
        const vehicle = vehicleRes.rows[0];

        await pool.query("UPDATE vehicles SET exit_time = CURRENT_TIMESTAMP WHERE id = $1", [vehicle.id]);
        await pool.query("UPDATE slots SET status='available' WHERE id=$1", [vehicle.slot_id]);
        
        const updatedRes = await pool.query("SELECT entry_time, exit_time FROM vehicles WHERE id = $1", [vehicle.id]);
        const v = updatedRes.rows[0];

        const entry = new Date(v.entry_time);
        const exit = new Date(v.exit_time);
        let diffMs = exit - entry;
        if (diffMs < 0) diffMs = 0;
        const diffHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60))); // Minimum 1 hour charge
        const cost = diffHours * 5;

        const receipt = {
            vehicle_no,
            entry_time: entry.toLocaleString(),
            exit_time: exit.toLocaleString(),
            duration: `${diffHours} hour(s)`,
            cost: `$${cost.toFixed(2)}`
        };

        res.render('exit', { error: null, success: `Vehicle exited successfully. Slot ${vehicle.slot_id} is free.`, receipt });
    } catch (err) {
        console.error(err);
        res.render('exit', { error: 'Server error.', success: null, receipt: null });
    }
});

const PORT = process.env.PORT || 3004;

// Export app for serverless platforms like Vercel
module.exports = app;

// Only listen locally if not deployed to Vercel (Vercel sets its own environment)
if (process.env.NODE_ENV !== 'production') {
    const server = app.listen(PORT, () => {
        console.log(`Smart Parking running on http://localhost:${PORT}`);
    });
    server.on('error', (e) => {
        console.error('Server error:', e);
    });
}
