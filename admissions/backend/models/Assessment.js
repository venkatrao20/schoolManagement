const pool = require('../config/db');

exports.create = async data => {
  const [result] = await pool.query(
    `INSERT INTO application_assessments
      (applicationId, assessmentType, scheduledAt, assessor, score, result, remarks, createdBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.applicationId, data.assessmentType, data.scheduledAt, data.assessor, data.score || null, data.result || 'Pending', data.remarks || null, data.createdBy]
  );
  return exports.findById(result.insertId);
};

exports.findByApplicationId = async applicationId => {
  const [rows] = await pool.query('SELECT * FROM application_assessments WHERE applicationId = ? ORDER BY scheduledAt DESC', [applicationId]);
  return rows;
};

exports.findById = async id => {
  const [rows] = await pool.query('SELECT * FROM application_assessments WHERE id = ?', [id]);
  return rows[0];
};

exports.update = async (id, fields) => {
  const keys = Object.keys(fields);
  if (!keys.length) return exports.findById(id);
  await pool.query(`UPDATE application_assessments SET ${keys.map(key => `${key} = ?`).join(', ')} WHERE id = ?`, [...keys.map(key => fields[key]), id]);
  return exports.findById(id);
};

exports.hasPassed = async applicationId => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM application_assessments WHERE applicationId = ? AND result = 'Passed'",
    [applicationId]
  );
  return rows[0].count > 0;
};
