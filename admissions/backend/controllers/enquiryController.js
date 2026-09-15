const Enquiry = require('../models/Enquiry');
const Parent = require('../models/Parent');


// =====================================================
// GENERATE ENQUIRY REFERENCE
// =====================================================

async function generateEnquiryRef() {

  const count = await Enquiry.count();

  return `ENQ-${String(count + 1).padStart(4, '0')}`;
}

const ENQUIRY_SOURCES = ['Newspaper', 'Billboard', 'Website', 'Social Media', 'Referral', 'Walk-in', 'Other'];

exports.createEnquiry = async (req, res) => {
  try {
    const required = ['studentName', 'dob', 'gender', 'classAppliedFor', 'parentName', 'contactNumber', 'source'];
    if (required.some(field => !String(req.body[field] || '').trim())) return res.status(400).json({ message: 'Student, parent, contact and source details are required' });
    if (!ENQUIRY_SOURCES.includes(req.body.source)) return res.status(400).json({ message: 'Invalid enquiry source' });
    const fields = ['studentName', 'dob', 'gender', 'classAppliedFor', 'parentName', 'contactNumber', 'email', 'address', 'aadhaarCard', 'source'];
    const enquiry = await Enquiry.create({
      enquiryRef: await generateEnquiryRef(),
      ...Object.fromEntries(fields.map(field => [field, req.body[field] || null])),
      createdBy: req.user.id
    });
    res.status(201).json(enquiry);
  } catch (err) { res.status(500).json({ message: err.message }); }
};


// =====================================================
// PARENT - CREATE ENQUIRY
// =====================================================

exports.createOwnEnquiry = async (req, res) => {

  try {

    const existing = await Enquiry.findByParentId(req.user.id);

    if (existing) {

      return res.status(409).json({
        message: 'An enquiry has already been submitted for your child'
      });

      }
  const {
    studentName,
    dob,
    gender,
    classAppliedFor,
    address,
    aadhaarCard,
    source
  } = req.body;


    if (
      !studentName ||
      !dob ||
      !gender ||
      !classAppliedFor ||
      !source
    ) {

      return res.status(400).json({
        message: 'Student details and enquiry source are required'
      });
    }


    const parent = await Parent.findById(req.user.id);

    if (!parent) {

      return res.status(404).json({
        message: 'Parent account not found'
      });
    }


    const enquiryRef = await generateEnquiryRef();


    const enquiry = await Enquiry.create({

      enquiryRef,

      studentName,

      dob,

      gender,

      classAppliedFor,

      parentName: parent.name,

      contactNumber: parent.contactNumber,

      email: parent.email,

      address,

      aadhaarCard,

      source,

      parentId: parent.id

    });


    res.status(201).json(enquiry);

  } catch (err) {

    console.error('Create enquiry error:', err);

    res.status(500).json({
      message: err.message
    });
  }
};


// =====================================================
// PARENT - VIEW OWN ENQUIRY
// =====================================================

exports.getMyEnquiry = async (req, res) => {

  try {

    const enquiry =
      await Enquiry.findByParentId(req.user.id);

    res.json(enquiry || null);

  } catch (err) {

    console.error('Get my enquiry error:', err);

    res.status(500).json({
      message: err.message
    });
  }
};


// =====================================================
// ADMIN - VIEW ALL
// =====================================================

exports.getEnquiries = async (req, res) => {

  try {

    const enquiries = await Enquiry.findAll();

    res.json(enquiries);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });
  }
};


// =====================================================
// ADMIN - VIEW ONE
// =====================================================

exports.getEnquiryById = async (req, res) => {

  try {

    const enquiry =
      await Enquiry.findById(req.params.id);

    if (!enquiry) {

      return res.status(404).json({
        message: 'Enquiry not found'
      });
    }

    res.json(enquiry);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });
  }
};


// =====================================================
// ADMIN - UPDATE ENQUIRY
// =====================================================

exports.updateEnquiry = async (req, res) => {

  try {

    const enquiry =
      await Enquiry.findById(req.params.id);

    if (!enquiry) {

      return res.status(404).json({
        message: 'Enquiry not found'
      });
    }


    const fields = [

      'studentName',

      'dob',

      'gender',

      'classAppliedFor',

      'parentName',

      'contactNumber',

      'email',

      'address',

      'aadhaarCard',

      'source'

    ];


    const updates = {};


    fields.forEach(field => {

      if (req.body[field] !== undefined) {

        updates[field] = req.body[field];

      }

    });


    const updated =
      await Enquiry.update(
        req.params.id,
        updates
      );


    res.json(updated);

  } catch (err) {

    console.error('Update enquiry error:', err);

    res.status(500).json({
      message: err.message
    });
  }
};


// =====================================================
// ADMIN - GET CONVERTED ENQUIRIES
// =====================================================

exports.getConvertedEnquiries = async (req, res) => {

  try {

    const enquiries = await Enquiry.findByStatus('Converted');

    res.json(enquiries);

  } catch (err) {

    console.error('Get converted enquiries error:', err);

    res.status(500).json({
      message: err.message
    });
  }
};


// =====================================================
// ADMIN - GET NON-CONVERTED ENQUIRIES
// =====================================================

exports.getNonConvertedEnquiries = async (req, res) => {

  try {

    const enquiries = await Enquiry.findNonConverted();

    res.json(enquiries);

  } catch (err) {

    console.error('Get non-converted enquiries error:', err);

    res.status(500).json({
      message: err.message
    });
  }
};


// =====================================================
// ADMIN - UPDATE STATUS
// =====================================================

exports.updateEnquiryStatus = async (req, res) => {

  try {

    const allowedStatuses = [

      'New',

      'Contacted',

      'Converted',

      'Closed'

    ];


    const { status } = req.body;


    if (!allowedStatuses.includes(status)) {

      return res.status(400).json({
        message: 'Invalid enquiry status'
      });
    }


    const enquiry =
      await Enquiry.findById(req.params.id);


    if (!enquiry) {

      return res.status(404).json({
        message: 'Enquiry not found'
      });
    }

    if (!ENQUIRY_SOURCES.includes(source)) {
      return res.status(400).json({ message: 'Invalid enquiry source' });
    }

    const transitions = {
      New: ['Contacted', 'Closed'],
      Contacted: ['Converted', 'Closed'],
      Converted: [],
      Closed: []
    };
    if (!transitions[enquiry.status].includes(status) && enquiry.status !== status) {
      return res.status(400).json({ message: `Cannot move from '${enquiry.status}' to '${status}'` });
    }


    const updated =
      await Enquiry.update(
        req.params.id,
        { status }
      );


    res.json(updated);

  } catch (err) {

    console.error('Update enquiry status error:', err);

    res.status(500).json({
      message: err.message
    });
  }
};
