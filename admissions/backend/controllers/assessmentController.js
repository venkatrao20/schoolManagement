const Application = require('../models/Application');
const Assessment = require('../models/Assessment');

exports.createAssessment = async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (application.status !== 'Assessment') return res.status(400).json({ message: 'Move the application to Assessment before recording an assessment or interview' });
    const { assessmentType, scheduledAt, assessor, score, result, remarks } = req.body;
    if (!assessmentType || !scheduledAt || !assessor) return res.status(400).json({ message: 'Assessment type, date and assessor are required' });
    if (!['Assessment', 'Interview'].includes(assessmentType) || (result && !['Pending', 'Passed', 'Failed'].includes(result))) return res.status(400).json({ message: 'Invalid assessment type or result' });
    res.status(201).json(await Assessment.create({ applicationId: application.id, assessmentType, scheduledAt, assessor, score, result, remarks, createdBy: req.user.id }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getAssessments = async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    res.json(await Assessment.findByApplicationId(application.id));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
    const fields = ['scheduledAt', 'assessor', 'score', 'result', 'remarks'];
    const updates = Object.fromEntries(fields.filter(field => req.body[field] !== undefined).map(field => [field, req.body[field]]));
    if (updates.result && !['Pending', 'Passed', 'Failed'].includes(updates.result)) return res.status(400).json({ message: 'Invalid assessment result' });
    updates.updatedBy = req.user.id;
    res.json(await Assessment.update(assessment.id, updates));
  } catch (err) { res.status(500).json({ message: err.message }); }
};
