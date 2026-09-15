const path = require('path');
const fs = require('fs');
const Application = require('../models/Application');
const Document = require('../models/Document');

exports.uploadDocument = async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (application.status !== 'Documents') return res.status(400).json({ message: 'Documents can only be uploaded while the application is in Documents status' });
    if (!req.file) return res.status(400).json({ message: 'A document file is required' });
    const documentType = req.body.documentType?.trim();
    if (!documentType) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: 'Document type is required' });
    }
    const document = await Document.create({
      applicationId: application.id, documentType, originalName: req.file.originalname,
      storedName: req.file.filename, mimeType: req.file.mimetype, fileSize: req.file.size, uploadedBy: req.user.id
    });
    res.status(201).json(document);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    res.json(await Document.findByApplicationId(application.id));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.verifyDocument = async (req, res) => {
  try {
    const { verificationStatus, verificationRemarks } = req.body;
    if (!['Verified', 'Rejected'].includes(verificationStatus)) return res.status(400).json({ message: 'Verification status must be Verified or Rejected' });
    if (verificationStatus === 'Rejected' && !verificationRemarks?.trim()) return res.status(400).json({ message: 'Rejection remarks are required' });
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });
    res.json(await Document.updateVerification(document.id, verificationStatus, verificationRemarks, req.user.id));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });
    const filePath = path.join(__dirname, '..', 'uploads', 'documents', document.storedName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Document file is unavailable' });
    res.download(filePath, document.originalName);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
