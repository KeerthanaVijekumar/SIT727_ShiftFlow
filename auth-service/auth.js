const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { USERS } = require('./users');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// === POST: Login ===
app.post('/login', (req, res) => {
  const { staff_id, password } = req.body;
  const user = USERS.find(u => u.staff_id === staff_id && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: staff_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, role: user.role });
});

// === VERSION ===
app.get('/version', (req, res) => {
  res.json({ version: '1.0.0-auth', updated: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});