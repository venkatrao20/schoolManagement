const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

exports.login = async (req, res) => {

  try {

    const username = req.body.username?.trim();
    const password = req.body.password;

    if (!username || !password) {
      return res.status(400).json({
        message: 'Username and password required'
      });
    }

    const user = await User.findByUsername(username);

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({
        message: 'User account is disabled'
      });
    }

    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '8h'
      }
    );

    res.json({
      token,
      role: user.role,
      name: user.name
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: err.message
    });

  }
};