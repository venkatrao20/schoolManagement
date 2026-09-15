const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Parent = require('../models/Parent');

function issueToken(parent) {
  const token = jwt.sign({ id: parent.id, role: 'Parent' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  return { token, role: 'Parent', name: parent.name };
}

exports.register = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const username = req.body.username?.trim();
    const password = req.body.password;
    const contactNumber = req.body.contactNumber?.trim();
    const email = req.body.email?.trim();

    if (!name || !username || !password || !contactNumber) {
      return res.status(400).json({ message: 'Name, username, password and contact number are required' });
    }

    const existing = await Parent.findByUsername(username);
    if (existing) return res.status(409).json({ message: 'That username is already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const parent = await Parent.create({ name, username, hashedPassword, contactNumber, email });

    res.status(201).json(issueToken(parent));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  const username = req.body.username?.trim();
  const password = req.body.password;
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

  const parent = await Parent.findByUsername(username);
  if (!parent) return res.status(401).json({ message: 'Invalid credentials' });

  const match = await bcrypt.compare(password, parent.password);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });

  res.json(issueToken(parent));
};
