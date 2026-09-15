const pool = require('./config/db');

async function migrate() {
  try {
    console.log('Starting database migration...');
    
    // Check if aadhaarCard column already exists in enquiries
    const [enquiryColumns] = await pool.query("SHOW COLUMNS FROM enquiries LIKE 'aadhaarCard'");
    if (enquiryColumns.length === 0) {
      console.log('Adding aadhaarCard column to enquiries table...');
      await pool.query('ALTER TABLE enquiries ADD COLUMN aadhaarCard VARCHAR(20) AFTER contactNumber');
      console.log('✓ Added aadhaarCard to enquiries table');
    } else {
      console.log('✓ aadhaarCard column already exists in enquiries table');
    }
    
    // Check if aadhaarCard column already exists in applications
    const [appColumns] = await pool.query("SHOW COLUMNS FROM applications LIKE 'aadhaarCard'");
    if (appColumns.length === 0) {
      console.log('Adding aadhaarCard column to applications table...');
      await pool.query('ALTER TABLE applications ADD COLUMN aadhaarCard VARCHAR(20) AFTER contactNumber');
      console.log('✓ Added aadhaarCard to applications table');
    } else {
      console.log('✓ aadhaarCard column already exists in applications table');
    }
    
    // Create parents table if it doesn't exist
    const [parentsTable] = await pool.query("SHOW TABLES LIKE 'parents'");
    if (parentsTable.length === 0) {
      console.log('Creating parents table...');
      await pool.query(`
        CREATE TABLE parents (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          username VARCHAR(50) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          contactNumber VARCHAR(20) NOT NULL,
          email VARCHAR(100),
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✓ Created parents table');
    } else {
      console.log('✓ parents table already exists');
    }

    // Add parentId column to enquiries + link it to parents
    const [parentIdColumn] = await pool.query("SHOW COLUMNS FROM enquiries LIKE 'parentId'");
    if (parentIdColumn.length === 0) {
      console.log('Adding parentId column to enquiries table...');
      await pool.query('ALTER TABLE enquiries ADD COLUMN parentId INT NULL AFTER createdBy');
      await pool.query('ALTER TABLE enquiries ADD FOREIGN KEY (parentId) REFERENCES parents(id)');
      console.log('✓ Added parentId to enquiries table');
    } else {
      console.log('✓ parentId column already exists in enquiries table');
    }

    // Allow enquiries.createdBy to be NULL (parents self-submit without a staff user)
    console.log('Relaxing enquiries.createdBy to allow NULL (parent self-submissions)...');
    await pool.query('ALTER TABLE enquiries MODIFY createdBy INT NULL');
    console.log('✓ enquiries.createdBy now nullable');

    console.log('\n✓ Migration completed successfully');
    const [appParentId] = await pool.query("SHOW COLUMNS FROM applications LIKE 'parentId'");
    if (!appParentId.length) await pool.query('ALTER TABLE applications ADD COLUMN parentId INT NULL AFTER enquiryId');
    const [decisionDate] = await pool.query("SHOW COLUMNS FROM applications LIKE 'decisionDate'");
    if (!decisionDate.length) await pool.query('ALTER TABLE applications ADD COLUMN decisionDate DATETIME NULL');
    const [decidedBy] = await pool.query("SHOW COLUMNS FROM applications LIKE 'decidedBy'");
    if (!decidedBy.length) await pool.query('ALTER TABLE applications ADD COLUMN decidedBy INT NULL');
    const [rejectionReason] = await pool.query("SHOW COLUMNS FROM applications LIKE 'rejectionReason'");
    if (!rejectionReason.length) await pool.query('ALTER TABLE applications ADD COLUMN rejectionReason VARCHAR(500) NULL');
    await pool.query("ALTER TABLE applications MODIFY status ENUM('Enquiry', 'Documents', 'Assessment', 'Approved', 'Rejected', 'Admitted') DEFAULT 'Documents'");
    await pool.query(`CREATE TABLE IF NOT EXISTS application_documents (id INT AUTO_INCREMENT PRIMARY KEY, applicationId INT NOT NULL, documentType VARCHAR(100) NOT NULL, originalName VARCHAR(255) NOT NULL, storedName VARCHAR(255) NOT NULL UNIQUE, mimeType VARCHAR(100) NOT NULL, fileSize INT UNSIGNED NOT NULL, verificationStatus ENUM('Pending','Verified','Rejected') NOT NULL DEFAULT 'Pending', verificationRemarks VARCHAR(500) NULL, verifiedBy INT NULL, verifiedAt DATETIME NULL, uploadedBy INT NOT NULL, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (applicationId) REFERENCES applications(id) ON DELETE CASCADE, FOREIGN KEY (verifiedBy) REFERENCES users(id), FOREIGN KEY (uploadedBy) REFERENCES users(id))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS application_assessments (id INT AUTO_INCREMENT PRIMARY KEY, applicationId INT NOT NULL, assessmentType ENUM('Assessment','Interview') NOT NULL, scheduledAt DATETIME NOT NULL, assessor VARCHAR(100) NOT NULL, score DECIMAL(5,2) NULL, result ENUM('Pending','Passed','Failed') NOT NULL DEFAULT 'Pending', remarks VARCHAR(1000) NULL, createdBy INT NOT NULL, updatedBy INT NULL, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, FOREIGN KEY (applicationId) REFERENCES applications(id) ON DELETE CASCADE, FOREIGN KEY (createdBy) REFERENCES users(id), FOREIGN KEY (updatedBy) REFERENCES users(id))`);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

migrate();
