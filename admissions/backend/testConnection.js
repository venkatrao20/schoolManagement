// testConnection.js
require('dotenv').config();
const pool = require('./config/db');

async function test() {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    console.log('Connected successfully. Users table:');
    console.log(rows);
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    process.exit();
  }
}

test();