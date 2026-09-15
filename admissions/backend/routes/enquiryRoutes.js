const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

const {
  createOwnEnquiry,
  createEnquiry,
  getMyEnquiry,
  getEnquiries,
  getConvertedEnquiries,
  getNonConvertedEnquiries,
  getEnquiryById,
  updateEnquiry,
  updateEnquiryStatus
} = require('../controllers/enquiryController');

// =====================================
// PARENT
// =====================================

router.get(
  '/my',
  protect,
  authorize('Parent'),
  getMyEnquiry
);

// =====================================
// ADMIN
// =====================================

router.post(
  '/',
  protect,
  authorize('Admin', 'Admissions', 'Management'),
  createEnquiry
);

router.get(
  '/',
  protect,
  authorize('Admin', 'Admissions', 'Management'),
  getEnquiries
);

router.get(
  '/status/converted',
  protect,
  authorize('Admin', 'Admissions', 'Management'),
  getConvertedEnquiries
);

router.get(
  '/status/non-converted',
  protect,
  authorize('Admin', 'Admissions', 'Management'),
  getNonConvertedEnquiries
);

router.get(
  '/:id',
  protect,
  authorize('Admin', 'Admissions', 'Management'),
  getEnquiryById
);

router.put(
  '/:id',
  protect,
  authorize('Admin', 'Admissions', 'Management'),
  updateEnquiry
);

router.patch(
  '/:id/status',
  protect,
  authorize('Admin', 'Admissions', 'Management'),
  updateEnquiryStatus
);

module.exports = router;
