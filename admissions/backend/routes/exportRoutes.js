const express = require('express');

const router = express.Router();

const {
  protect,
  authorize
} = require('../middleware/auth');

const {
  exportConverted,
  exportNonConverted
} = require('../controllers/exportController');


// =====================================================
// EXPORT CONVERTED ENQUIRIES
// =====================================================

router.get(
  '/converted',
  protect,
  authorize('Admin', 'Admissions', 'Management'),
  exportConverted
);


// =====================================================
// EXPORT NON-CONVERTED ENQUIRIES
// =====================================================

router.get(
  '/non-converted',
  protect,
  authorize('Admin', 'Admissions', 'Management'),
  exportNonConverted
);


module.exports = router;