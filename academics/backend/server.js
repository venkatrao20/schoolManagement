const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Serve frontend (static files)
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- API ROUTES ----------
app.use('/api/academics', require('./routes/academics'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/exams', require('./routes/exams'));

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'School Academics API is running', time: new Date().toISOString() });
});

// Fallback to index.html for the SPA frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log('==================================================');
    console.log(' School Management App - Academics Module');
    console.log(' Server running at: http://localhost:' + PORT);
    console.log('==================================================');
});
