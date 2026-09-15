CREATE DATABASE IF NOT EXISTS school_admission;
USE school_admission;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('Admissions', 'Management', 'Admin') NOT NULL,
  status ENUM('Active', 'Disabled') DEFAULT 'Active',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE parents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  contactNumber VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE enquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enquiryRef VARCHAR(20) NOT NULL UNIQUE,
  studentName VARCHAR(100) NOT NULL,
  dob DATE NOT NULL,
  gender ENUM('Male', 'Female', 'Other') NOT NULL,
  classAppliedFor VARCHAR(50) NOT NULL,
  parentName VARCHAR(100) NOT NULL,
  contactNumber VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  address VARCHAR(255),
  aadhaarCard VARCHAR(20),
  source VARCHAR(100),
  status ENUM('New', 'Contacted', 'Converted', 'Closed') DEFAULT 'New',
  createdBy INT NULL,
  parentId INT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(id),
  FOREIGN KEY (parentId) REFERENCES parents(id)
);

CREATE TABLE applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  applicationRef VARCHAR(20) NOT NULL UNIQUE,
  enquiryId INT NULL,
  parentId INT NULL,
  studentName VARCHAR(100) NOT NULL,
  dob DATE NOT NULL,
  gender ENUM('Male', 'Female', 'Other') NOT NULL,
  classAppliedFor VARCHAR(50) NOT NULL,
  parentName VARCHAR(100) NOT NULL,
  contactNumber VARCHAR(20) NOT NULL,
  previousSchool VARCHAR(100),
  aadhaarCard VARCHAR(20),
  status ENUM('Documents', 'Assessment', 'Approved', 'Rejected', 'Admitted') DEFAULT 'Documents',
  decisionDate DATETIME NULL,
  decidedBy INT NULL,
  rejectionReason VARCHAR(500) NULL,
  createdBy INT NOT NULL,
  updatedBy INT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (enquiryId) REFERENCES enquiries(id),
  FOREIGN KEY (parentId) REFERENCES parents(id),
  FOREIGN KEY (decidedBy) REFERENCES users(id),
  FOREIGN KEY (createdBy) REFERENCES users(id)
);

CREATE TABLE application_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  applicationId INT NOT NULL,
  documentType VARCHAR(100) NOT NULL,
  originalName VARCHAR(255) NOT NULL,
  storedName VARCHAR(255) NOT NULL UNIQUE,
  mimeType VARCHAR(100) NOT NULL,
  fileSize INT UNSIGNED NOT NULL,
  verificationStatus ENUM('Pending', 'Verified', 'Rejected') NOT NULL DEFAULT 'Pending',
  verificationRemarks VARCHAR(500) NULL,
  verifiedBy INT NULL,
  verifiedAt DATETIME NULL,
  uploadedBy INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (applicationId) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (verifiedBy) REFERENCES users(id),
  FOREIGN KEY (uploadedBy) REFERENCES users(id)
);

CREATE TABLE application_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  applicationId INT NOT NULL,
  assessmentType ENUM('Assessment', 'Interview') NOT NULL,
  scheduledAt DATETIME NOT NULL,
  assessor VARCHAR(100) NOT NULL,
  score DECIMAL(5,2) NULL,
  result ENUM('Pending', 'Passed', 'Failed') NOT NULL DEFAULT 'Pending',
  remarks VARCHAR(1000) NULL,
  createdBy INT NOT NULL,
  updatedBy INT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (applicationId) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (createdBy) REFERENCES users(id),
  FOREIGN KEY (updatedBy) REFERENCES users(id)
);
