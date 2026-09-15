require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const parentRoutes = require('./routes/parentRoutes');
const exportRoutes = require('./routes/exportRoutes');
const documentRoutes = require('./routes/documentRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/assessments', assessmentRoutes);

app.get('/api/dashboard', require('./middleware/auth').protect, require('./middleware/auth').authorize('Admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM enquiries) AS enquiries,
        (SELECT COUNT(*) FROM applications) AS applications,
        (SELECT COUNT(*) FROM applications WHERE status = 'Admitted') AS admitted,
        (SELECT COUNT(*) FROM applications WHERE status = 'Assessment') AS assessments
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
if (require('fs').existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(frontendBuild, 'index.html')));
} else {
  app.get('/', (req, res) => res.send('Admissions API running'));
}

pool.query('SELECT 1')
  .then(() => {
    console.log('MySQL connected');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch(err => console.error('DB connection error:', err));
