const pool = require('../config/db');

exports.findByUsername = async (username) => {

  const [rows] = await pool.query(
    `SELECT *
     FROM users
     WHERE TRIM(username) = TRIM(?)
        OR TRIM(name) = TRIM(?)
     LIMIT 1`,
    [username, username]
  );

  return rows[0];
};

exports.create = async ({ name, username, hashedPassword, role }) => {

  const [result] = await pool.query(
    `INSERT INTO users
     (name, username, password, role)
     VALUES (?, ?, ?, ?)`,
    [name, username, hashedPassword, role]
  );

  return result.insertId;
};

exports.findById = async (id) => {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );

  return rows[0];
};