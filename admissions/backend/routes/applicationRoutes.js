const express = require('express');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

const {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  updateStatus,
  decideApplication
} = require('../controllers/applicationController');


// ===============================
// ADMIN
// ===============================

// Admin creates application
router.post(
  '/',
  protect,
  authorize('Admin', 'Admissions'),
  createApplication
);

// Admin views all applications
router.get(
  '/',
  protect,
  authorize('Admin', 'Admissions', 'Management'),
  getApplications
);

// Admin views one application
router.get(
  '/:id',
  protect,
  authorize('Admin', 'Admissions', 'Management'),
  getApplicationById
);

// Admin edits application
router.put(
  '/:id',
  protect,
  authorize('Admin', 'Admissions'),
  updateApplication
);

// Admin changes application status
router.patch(
  '/:id/status',
  protect,
  authorize('Admin', 'Admissions'),
  updateStatus
);
router.patch(
  '/:id/decision',
  protect,
  authorize('Admin'),
  decideApplication
);
module.exports = router;
