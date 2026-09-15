const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { register, login } = require('../controllers/parentAuthController');
const { createOwnEnquiry, getMyEnquiry } = require('../controllers/enquiryController');

// Public
router.post('/register', register);
router.post('/login', login);

// Protected (parent only)
router.get('/my-enquiry', protect, authorize('Parent'), getMyEnquiry);
router.post('/enquiry', protect, authorize('Parent'), createOwnEnquiry);

module.exports = router;
