const pool = require('../config/db');

exports.create = async data => {
  const [result] = await pool.query(
    `INSERT INTO application_documents
      (applicationId, documentType, originalName, storedName, mimeType, fileSize, uploadedBy)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.applicationId, data.documentType, data.originalName, data.storedName, data.mimeType, data.fileSize, data.uploadedBy]
  );
  return exports.findById(result.insertId);
};

exports.findByApplicationId = async applicationId => {
  const [rows] = await pool.query(
    `SELECT d.*, u.name AS verifierName
     FROM application_documents d
     LEFT JOIN users u ON d.verifiedBy = u.id
     WHERE d.applicationId = ? ORDER BY d.createdAt DESC`,
    [applicationId]
  );
  return rows;
};

exports.findById = async id => {
  const [rows] = await pool.query('SELECT * FROM application_documents WHERE id = ?', [id]);
  return rows[0];
};

exports.updateVerification = async (id, status, remarks, verifiedBy) => {
  await pool.query(
    `UPDATE application_documents
     SET verificationStatus = ?, verificationRemarks = ?, verifiedBy = ?, verifiedAt = NOW()
     WHERE id = ?`,
    [status, remarks || null, verifiedBy, id]
  );
  return exports.findById(id);
};

exports.countUnverified = async applicationId => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM application_documents
     WHERE applicationId = ? AND verificationStatus != 'Verified'`,
    [applicationId]
  );
  return rows[0].count;
};

exports.count = async applicationId => {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM application_documents WHERE applicationId = ?', [applicationId]);
  return rows[0].count;
};
