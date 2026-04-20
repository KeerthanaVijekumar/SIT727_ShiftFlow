const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const { Shift, Allocation } = require('./model');
const app = express();
const PORT = process.env.PORT || 3000;

console.log("MONGO_URL =", process.env.MONGO_URL);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URL, {}).then(() => {
  console.log("MongoDB connected");
}).catch(err => {
  console.error("MongoDB error:", err);
});

const corsOptions = {
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));


// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Middleware to parse URL-encoded form data
app.use(bodyParser.urlencoded({ extended: true }));

// === Create a Shift ===
app.post('/shifts', async (req, res) => {
  console.log('POST /shifts body:', req.body);  // Debug log to verify body

  const { shiftId, date, startTime, endTime } = req.body;

  if (!shiftId || !date || !startTime || !endTime) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existingShift = await Shift.findOne({ shiftId });
    if (existingShift) {
      return res.status(409).json({ message: 'Shift ID already exists' });
    }

    const newShift = new Shift({ shiftId, date, startTime, endTime });
    await newShift.save();
    console.log('Shift saved:', newShift);

    res.status(201).json({ message: 'Shift published', shift: newShift });
  } catch (err) {
    console.error('Error creating shift:', err);
    res.status(500).json({ message: 'Failed to create shift' });
  }
});

// === View All Shifts ===
app.get('/shifts', async (req, res) => {
  try {
    // Use .lean() to return plain JS objects (fixes undefined field issue)
    const shifts = await Shift.find().lean();
    res.json(shifts);
  } catch (err) {
    console.error("Failed to fetch shifts:", err);
    res.status(500).json({ message: "Failed to fetch shifts" });
  }
});

// === GET: All Allocated (Picked) Shifts ===
app.get('/picked-shifts', async (req, res) => {
  try {
    const allocations = await Allocation.find().lean();
    const shiftIds = allocations.map(a => a.shift_id);
    const shifts = await Shift.find({ shiftId: { $in: shiftIds } }).lean();

    const combined = allocations.map(a => {
      const shift = shifts.find(s => s.shiftId === a.shift_id);
      return {
        employee_id: a.employee_id,
        shift_id: a.shift_id,
        approved: a.approved || false,
        date: shift?.date || '',
        startTime: shift?.startTime || '',
        endTime: shift?.endTime || ''
      };
    });

    res.json(combined);
  } catch (err) {
    console.error("Error loading picked shifts:", err);
    res.status(500).json({ message: 'Failed to load picked shifts' });
  }
});


// === Approve a Shift Allocation ===
app.put('/approve', async (req, res) => {
  const { employee_id, shift_id } = req.body;

  const allocation = await Allocation.findOne({ employee_id, shift_id });
  if (!allocation) return res.status(404).json({ error: 'Allocation not found' });

  allocation.approved = true;
  await allocation.save();

  res.json({ message: 'Shift approved', allocation });
});

// === View Approved Allocations ===
app.get('/allocations', async (req, res) => {
  const allocations = await Allocation.find({ approved: true });
  res.json(allocations);
});

// === Delete a Shift by shiftId ===
app.delete('/shifts/:shiftId', async (req, res) => {
  const { shiftId } = req.params;

  try {
    const deleted = await Shift.findOneAndDelete({ shiftId });
    if (!deleted) {
      return res.status(404).json({ message: 'Shift not found' });
    }
    res.json({ message: 'Shift deleted successfully', shift: deleted });
  } catch (err) {
    console.error("Error deleting shift:", err);
    res.status(500).json({ message: 'Failed to delete shift' });
  }
});

// === Edit/Update a Shift by shiftId ===
app.put('/shifts/:shiftId', async (req, res) => {
  const { shiftId } = req.params;
  const { date, startTime, endTime } = req.body;

  if (!date || !startTime || !endTime) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const updated = await Shift.findOneAndUpdate(
      { shiftId },
      { date, startTime, endTime },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Shift not found' });
    }

    res.json({ message: 'Shift updated successfully', shift: updated });
  } catch (err) {
    console.error("Error updating shift:", err);
    res.status(500).json({ message: 'Failed to update shift' });
  }
});

// === View Only Available Shifts ===
app.get('/shifts/available', async (req, res) => {
  try {
    const allocatedShiftIds = await Allocation.find().distinct('shift_id');
    const availableShifts = await Shift.find({ shiftId: { $nin: allocatedShiftIds } }).lean();
    res.json(availableShifts);
  } catch (err) {
    console.error("Error fetching available shifts:", err);
    res.status(500).json({ message: "Failed to fetch available shifts" });
  }
});



// === VERSION ===
app.get('/version', (req, res) => {
  res.json({ version: '1.0.0-admin', updated: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Admin service running on port ${PORT}`);
});