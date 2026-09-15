const pool = require('../config/db');


// =====================================================
// COUNT
// =====================================================

exports.count = async () => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM enquiries'
  );

  return rows[0].count;
};


// =====================================================
// CREATE
// =====================================================

exports.create = async (data) => {
const {
    enquiryRef,
    studentName,
    dob,
    gender,
    classAppliedFor,
    parentName,
    contactNumber,
    email,
    address,
    aadhaarCard,
    source,
    createdBy,
    parentId
} = data;

  const [result] = await pool.query(
    `INSERT INTO enquiries
    (
      enquiryRef,
      studentName,
      dob,
      gender,
      classAppliedFor,
      parentName,
      contactNumber,
      email,
      address,
      aadhaarCard,
      source,
      createdBy,
      parentId
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      enquiryRef,
      studentName,
      dob,
      gender,
      classAppliedFor,
      parentName,
      contactNumber,
      email,
      address,
      aadhaarCard,
      source || null,
      createdBy || null,
      parentId || null
    ]
  );

  return exports.findById(result.insertId);
};


// =====================================================
// FIND BY PARENT
// =====================================================

exports.findByParentId = async (parentId) => {

  const [rows] = await pool.query(
    `SELECT *
     FROM enquiries
     WHERE parentId = ?
     LIMIT 1`,
    [parentId]
  );

  return rows[0];
};


// =====================================================
// FIND ALL
// =====================================================

exports.findAll = async () => {

  const [rows] = await pool.query(
    `SELECT *
     FROM enquiries
     ORDER BY createdAt DESC`
  );

  return rows;
};


// =====================================================
// FIND BY ID
// =====================================================

exports.findById = async (id) => {

  const [rows] = await pool.query(
    `SELECT *
     FROM enquiries
     WHERE id = ?`,
    [id]
  );

  return rows[0];
};


// =====================================================
// FIND BY STATUS
// =====================================================

exports.findByStatus = async (status) => {

  const [rows] = await pool.query(
    `SELECT *
     FROM enquiries
     WHERE status = ?
     ORDER BY createdAt DESC`,
    [status]
  );

  return rows;
};


// =====================================================
// FIND NON-CONVERTED
// =====================================================

exports.findNonConverted = async () => {

  const [rows] = await pool.query(
    `SELECT *
     FROM enquiries
     WHERE status != 'Converted'
     ORDER BY createdAt DESC`
  );

  return rows;
};


// =====================================================
// UPDATE
// =====================================================

exports.update = async (id, fields) => {

  const keys = Object.keys(fields);

  if (!keys.length) {
    return exports.findById(id);
  }

  const setClause = keys
    .map(key => `${key} = ?`)
    .join(', ');

  const values = keys.map(key => fields[key]);

  await pool.query(
    `UPDATE enquiries
     SET ${setClause}
     WHERE id = ?`,
    [...values, id]
  );

  return exports.findById(id);
};
