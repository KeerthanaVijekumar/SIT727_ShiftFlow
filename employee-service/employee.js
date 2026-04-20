const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const path = require('path');
const { Shift, Allocation, Clockin } = require('./model');
const app = express();
const PORT = process.env.PORT || 3000;

console.log("MONGO_URL =", process.env.MONGO_URL);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URL, {}).then(() => {
  console.log("MongoDB connected");
}).catch(err => {
  console.error("MongoDB error:", err);
});

app.use(cors());
app.use(bodyParser.json());

// Auth Middleware
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}


// === GET: Available Shifts (Not Yet Allocated) ===
app.get('/shifts/available', verifyToken, async (req, res) => {
  try {
    const allocations = await Allocation.find().select('shift_id');

    const allocatedShiftIds = allocations
      .filter(a => a && a.shift_id) 
      .map(a => a.shift_id.toString()); 

    const allShifts = await Shift.find();

    const availableShifts = allShifts.filter(s => {
      const sid = s && s._id ? s._id.toString() : null;
      return sid && !allocatedShiftIds.includes(sid);
    });

    res.json(availableShifts);
  } catch (err) {
    console.error('Error in /shifts/available:', err.message);
    res.status(500).json({ message: 'Failed to load available shifts.' });
  }
});


// === POST: Accept a Shift ===
app.post('/allocate', verifyToken, async (req, res) => {
  const { shift_id } = req.body;

  try {
    // Check if this shift is already picked
    const existing = await Allocation.findOne({ shift_id });
    if (existing) {
      return res.status(400).json({ message: 'This shift has already been picked by another employee.' });
    }

    // Save new allocation
    const newAlloc = new Allocation({
      employee_id: req.user.id,
      shift_id
    });

    await newAlloc.save();
    res.json({ message: 'Shift allocated successfully', allocation: newAlloc });
  } catch (err) {
    console.error('Error allocating shift:', err);
    res.status(500).json({ message: 'Failed to allocate shift' });
  }
});


// === GET: My Roster (Allocated Shifts) ===
app.get('/roster', verifyToken, async (req, res) => {
  const allocations = await Allocation.find({ employee_id: req.user.id });
  const shiftIds = allocations.map(a => a.shift_id);
  const shifts = await Shift.find({ _id: { $in: shiftIds } });
  res.json(shifts);
});

// === GET: Dashboard View for Today's Shift ===
app.get('/dashboard', verifyToken, async (req, res) => {
  const allocations = await Allocation.find({ employee_id: req.user.id });
  const shiftIds = allocations.map(a => a.shift_id);
  const shifts = await Shift.find({ _id: { $in: shiftIds } });

  const now = new Date();
  const todayShift = shifts.find(shift => new Date(shift.date).toDateString() === now.toDateString());

  if (!todayShift) return res.json({ message: 'No shift for today' });

  const clock = await Clockin.findOne({
    user_id: req.user.id,
    shift_id: todayShift._id
  });

  res.json({
    shift: todayShift,
    clockStatus: {
      clockedIn: !!clock?.clock_in,
      clockedOut: !!clock?.clock_out
    }
  });
});

// === POST: Clock-In ===
app.post('/clockin', verifyToken, async (req, res) => {
  const { shift_id } = req.body;
  const timestamp = new Date().toISOString();

  const clock = new Clockin({
    user_id: req.user.id,
    shift_id,
    clock_in: timestamp
  });

  await clock.save();
  res.json({ message: 'Clock-in successful', time: timestamp });
});

// === POST: Clock-Out ===
app.post('/clockout', verifyToken, async (req, res) => {
  const { shift_id } = req.body;

  const clock = await Clockin.findOne({
    user_id: req.user.id,
    shift_id,
    clock_out: null
  });

  if (!clock) return res.status(404).json({ error: 'No active clock-in' });

  clock.clock_out = new Date().toISOString();
  await clock.save();

  res.json({ message: 'Clock-out successful', time: clock.clock_out });
});

// === VERSION ===
app.get('/version', (req, res) => {
  res.json({ version: '3.1.0-employee', updated: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Employee service running on port ${PORT}`);
});