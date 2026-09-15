const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/documentController');

const uploadDir = path.join(__dirname, '..', 'uploads', 'documents');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(null, ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype))
});
const router = express.Router();

router.get('/application/:applicationId', protect, authorize('Admin', 'Admissions', 'Management'), controller.getDocuments);
router.post('/application/:applicationId', protect, authorize('Admin', 'Admissions'), upload.single('file'), controller.uploadDocument);
router.patch('/:id/verification', protect, authorize('Admin', 'Admissions'), controller.verifyDocument);
router.get('/:id/download', protect, authorize('Admin', 'Admissions', 'Management'), controller.downloadDocument);

module.exports = router;
