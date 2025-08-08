const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

// Create an Express application
const app = express();
// Use the port provided by the environment (e.g. Render) or default to 3000
const PORT = process.env.PORT || 3000;

/*
 * Database configuration
 *
 * This prototype supports two different storage backends:
 *  1. SQLite (the default): Uses a local file (data.db) and requires no
 *     external dependencies. Perfect for trying the app locally or within this
 *     container.
 *  2. PostgreSQL: If the environment variable `DATABASE_URL` is set (as on
 *     Render), the app uses a Postgres connection via the `pg` module. This
 *     makes it easy to deploy to Render or another host that provides a
 *     Postgres database.
 */
const isPostgres = !!process.env.DATABASE_URL;
let db;
let pgPool;
if (isPostgres) {
    // Configure Postgres connection. Render requires SSL but does not verify
    // certificates, so set rejectUnauthorized to false.
    pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
    // Ensure the notes table exists when connected to Postgres.
    (async () => {
        try {
            await pgPool.query(
                'CREATE TABLE IF NOT EXISTS notes (id SERIAL PRIMARY KEY, text TEXT NOT NULL)'
            );
        } catch (err) {
            console.error('Error creating Postgres table:', err);
        }
    })();
} else {
    // Initialize a simple SQLite database stored in a local file.
    db = new sqlite3.Database('./data.db', (err) => {
        if (err) {
            console.error('Error opening database', err);
        } else {
            // Create the notes table if it doesn’t exist.
            db.run(
                'CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL)',
                (tableErr) => {
                    if (tableErr) {
                        console.error('Could not create table', tableErr);
                    }
                },
            );
        }
    });
}

// Enable CORS and JSON body parsing
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the `public` directory
app.use(express.static(path.join(__dirname, 'public')));

// GET endpoint to return all notes
app.get('/api/notes', async (req, res) => {
    try {
        if (isPostgres) {
            const result = await pgPool.query('SELECT id, text FROM notes ORDER BY id DESC');
            res.json(result.rows);
        } else {
            db.all('SELECT id, text FROM notes ORDER BY id DESC', [], (err, rows) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json(rows);
                }
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST endpoint to create a new note
app.post('/api/notes', async (req, res) => {
    const { text } = req.body;
    if (!text || !text.trim()) {
        res.status(400).json({ error: 'Text is required' });
        return;
    }
    const trimmed = text.trim();
    try {
        if (isPostgres) {
            const result = await pgPool.query(
                'INSERT INTO notes (text) VALUES ($1) RETURNING id, text',
                [trimmed]
            );
            res.json(result.rows[0]);
        } else {
            db.run('INSERT INTO notes (text) VALUES (?)', [trimmed], function (err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json({ id: this.lastID, text: trimmed });
                }
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
