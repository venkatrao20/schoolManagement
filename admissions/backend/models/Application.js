const pool = require('../config/db');

exports.count = async () => {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM applications');
  return rows[0].count;
};

exports.create = async (data) => {
  const { applicationRef, enquiryId, parentId, studentName, dob, gender, classAppliedFor, parentName, contactNumber, previousSchool, aadhaarCard, createdBy } = data;
  const [result] = await pool.query(
    `INSERT INTO applications (applicationRef, enquiryId, parentId, studentName, dob, gender, classAppliedFor, parentName, contactNumber, previousSchool, aadhaarCard, createdBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [applicationRef, enquiryId, parentId, studentName, dob, gender, classAppliedFor, parentName, contactNumber, previousSchool, aadhaarCard, createdBy]
  );
  return exports.findById(result.insertId);
};

exports.findAll = async () => {
  const [rows] = await pool.query(
    `SELECT a.*, e.enquiryRef, e.status AS enquiryStatus, p.name AS linkedParentName
     FROM applications a
     LEFT JOIN enquiries e ON a.enquiryId = e.id
     LEFT JOIN parents p ON a.parentId = p.id
     ORDER BY a.createdAt DESC`
  );
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT a.*, e.enquiryRef, e.status AS enquiryStatus, p.name AS linkedParentName
     FROM applications a
     LEFT JOIN enquiries e ON a.enquiryId = e.id
     LEFT JOIN parents p ON a.parentId = p.id
     WHERE a.id = ?`,
    [id]
  );
  return rows[0];
};

exports.update = async (id, fields) => {
  const keys = Object.keys(fields);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => fields[k]);
  await pool.query(`UPDATE applications SET ${setClause} WHERE id = ?`, [...values, id]);
  return exports.findById(id);
};

exports.findByEnquiryId = async (enquiryId) => {
  const [rows] = await pool.query(
    `SELECT a.*, e.enquiryRef, e.status AS enquiryStatus
     FROM applications a
     LEFT JOIN enquiries e ON a.enquiryId = e.id
     WHERE a.enquiryId = ?
     ORDER BY a.createdAt DESC`,
    [enquiryId]
  );

  return rows;
}; 
