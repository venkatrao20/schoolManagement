const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/assessmentController');
const router = express.Router();

router.get('/application/:applicationId', protect, authorize('Admin', 'Admissions', 'Management'), controller.getAssessments);
router.post('/application/:applicationId', protect, authorize('Admin', 'Admissions'), controller.createAssessment);
router.put('/:id', protect, authorize('Admin', 'Admissions'), controller.updateAssessment);

module.exports = router;
