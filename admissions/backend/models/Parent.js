const pool = require('../config/db');

exports.findByUsername = async (username) => {
  const [rows] = await pool.query(
    'SELECT * FROM parents WHERE TRIM(username) = TRIM(?) LIMIT 1',
    [username]
  );  
  return rows[0];
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM parents WHERE id = ?', [id]);
  return rows[0];
};

exports.create = async ({ name, username, hashedPassword, contactNumber, email }) => {
  const [result] = await pool.query(
    'INSERT INTO parents (name, username, password, contactNumber, email) VALUES (?, ?, ?, ?, ?)',
    [name, username, hashedPassword, contactNumber, email || null]
  );
  return exports.findById(result.insertId);
};
