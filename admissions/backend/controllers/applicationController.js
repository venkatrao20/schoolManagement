const Application = require('../models/Application');
const Enquiry = require('../models/Enquiry');
const Document = require('../models/Document');
const Assessment = require('../models/Assessment');
const { isValidTransition } = require('../utils/statusTransitions');

async function generateApplicationRef() {
  const count = await Application.count();
  return `APP-${String(count + 1).padStart(4, '0')}`;
}

exports.createApplication = async (req, res) => {
  try {
    const { enquiryId, previousSchool, aadhaarCard } = req.body;

    if (!enquiryId) return res.status(400).json({ message: 'A converted enquiry is required' });
    const enquiry = await Enquiry.findById(enquiryId);
    if (!enquiry) return res.status(400).json({ message: 'Linked enquiry not found' });
    if (enquiry.status !== 'Converted') return res.status(400).json({ message: 'Applications can only be created from converted enquiries' });
    if (await Application.findByEnquiryId(enquiry.id).then(rows => rows.length)) return res.status(409).json({ message: 'An application already exists for this enquiry' });

    const applicationRef = await generateApplicationRef();
    const application = await Application.create({
      applicationRef, enquiryId: enquiry.id, parentId: enquiry.parentId || null,
      studentName: enquiry.studentName, dob: enquiry.dob, gender: enquiry.gender,
      classAppliedFor: enquiry.classAppliedFor, parentName: enquiry.parentName,
      contactNumber: enquiry.contactNumber, previousSchool, aadhaarCard: aadhaarCard || enquiry.aadhaarCard,
      createdBy: req.user.id
    });

    res.status(201).json(application);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getApplications = async (req, res) => {
  const apps = await Application.findAll();
  res.json(apps);
};

exports.getApplicationById = async (req, res) => {
  const app = await Application.findById(req.params.id);
  if (!app) return res.status(404).json({ message: 'Application not found' });
  res.json(app);
};

exports.updateApplication = async (req, res) => {
  const existing = await Application.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Application not found' });

  const allowedFields = ['studentName', 'dob', 'gender', 'classAppliedFor', 'parentName', 'contactNumber', 'previousSchool', 'aadhaarCard'];
  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });
  updates.updatedBy = req.user.id;

  const updated = await Application.update(req.params.id, updates);
  res.json(updated);
};
exports.updateStatus = async (req, res) => {
  try {
    const { newStatus } = req.body;

    const app = await Application.findById(req.params.id);

    if (!app) {
      return res.status(404).json({
        message: 'Application not found'
      });
    }

    if (!newStatus) {
      return res.status(400).json({
        message: 'New status is required'
      });
    }

    if (['Approved', 'Rejected'].includes(newStatus)) {
      return res.status(400).json({ message: 'Use the approval decision endpoint for approval or rejection' });
    }

    if (newStatus === 'Assessment') {
      const documentCount = await Document.count(app.id);
      const unverifiedCount = await Document.countUnverified(app.id);
      if (!documentCount || unverifiedCount) {
        return res.status(400).json({ message: 'Upload and verify all documents before starting assessment' });
      }
    }

    if (!isValidTransition(app.status, newStatus)) {
      return res.status(400).json({
        message: `Cannot move from '${app.status}' to '${newStatus}'`
      });
    }

    const updated = await Application.update(
      req.params.id,
      {
        status: newStatus,
        updatedBy: req.user.id
      }
    );

    res.json(updated);

  } catch (err) {
    console.error('Update application status error:', err);

    res.status(500).json({
      message: err.message
    });
  }
};
exports.decideApplication = async (req, res) => {
  try {
    const { decision, rejectionReason } = req.body;
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });
    if (!['Approved', 'Rejected'].includes(decision)) return res.status(400).json({ message: 'Decision must be Approved or Rejected' });
    if (app.status !== 'Assessment') return res.status(400).json({ message: 'Only applications in assessment can be decided' });
    if (decision === 'Approved' && !(await Assessment.hasPassed(app.id))) return res.status(400).json({ message: 'A passed assessment or interview is required for approval' });
    if (decision === 'Rejected' && !rejectionReason?.trim()) return res.status(400).json({ message: 'A rejection reason is required' });
    const updated = await Application.update(app.id, {
      status: decision,
      decisionDate: new Date(),
      decidedBy: req.user.id,
      rejectionReason: decision === 'Rejected' ? rejectionReason.trim() : null,
      updatedBy: req.user.id
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
