const Enquiry = require('../models/Enquiry');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');


// =====================================================
// EXPORT CONVERTED ENQUIRIES TO EXCEL
// =====================================================

exports.exportConverted = async (req, res) => {

  try {

    const enquiries = await Enquiry.findByStatus('Converted');

    if (!enquiries || enquiries.length === 0) {
      return res.status(404).json({
        message: 'No converted enquiries found'
      });
    }

    // Format data for Excel
    const data = enquiries.map(enquiry => ({
      'Enquiry Ref': enquiry.enquiryRef,
      'Student Name': enquiry.studentName,
      'DOB': enquiry.dob,
      'Gender': enquiry.gender,
      'Class Applied For': enquiry.classAppliedFor,
      'Parent Name': enquiry.parentName,
      'Contact Number': enquiry.contactNumber,
      'Email': enquiry.email,
      'Address': enquiry.address,
      'Aadhaar Card': enquiry.aadhaarCard,
      'Source': enquiry.source,
      'Status': enquiry.status,
      'Created At': enquiry.createdAt
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 8 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Converted Enquiries');

    // Generate filename
    const filename = `Converted_Enquiries_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filepath = path.join(__dirname, '../../uploads', filename);

    // Ensure uploads directory exists
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Write file
    XLSX.writeFile(workbook, filepath);

    // Send file to client
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Optionally delete file after download
      // fs.unlink(filepath, (err) => {
      //   if (err) console.error('File deletion error:', err);
      // });
    });

  } catch (err) {

    console.error('Converted export error:', err);

    res.status(500).json({
      message: err.message
    });
  }
};


// =====================================================
// EXPORT NON-CONVERTED ENQUIRIES TO EXCEL
// =====================================================

exports.exportNonConverted = async (req, res) => {

  try {

    const enquiries = await Enquiry.findNonConverted();

    if (!enquiries || enquiries.length === 0) {
      return res.status(404).json({
        message: 'No non-converted enquiries found'
      });
    }

    // Format data for Excel
    const data = enquiries.map(enquiry => ({
      'Enquiry Ref': enquiry.enquiryRef,
      'Student Name': enquiry.studentName,
      'DOB': enquiry.dob,
      'Gender': enquiry.gender,
      'Class Applied For': enquiry.classAppliedFor,
      'Parent Name': enquiry.parentName,
      'Contact Number': enquiry.contactNumber,
      'Email': enquiry.email,
      'Address': enquiry.address,
      'Aadhaar Card': enquiry.aadhaarCard,
      'Source': enquiry.source,
      'Status': enquiry.status,
      'Created At': enquiry.createdAt
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 8 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Non-Converted Enquiries');

    // Generate filename
    const filename = `Non_Converted_Enquiries_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filepath = path.join(__dirname, '../../uploads', filename);

    // Ensure uploads directory exists
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Write file
    XLSX.writeFile(workbook, filepath);

    // Send file to client
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Optionally delete file after download
      // fs.unlink(filepath, (err) => {
      //   if (err) console.error('File deletion error:', err);
      // });
    });

  } catch (err) {

    console.error('Non-converted export error:', err);

    res.status(500).json({
      message: err.message
    });
  }
};