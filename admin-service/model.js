const mongoose = require('mongoose');

// === SHIFT MODEL ===
const ShiftSchema = new mongoose.Schema({
  shiftId: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true }
});

const Shift = mongoose.model('Shift', ShiftSchema);

// === ALLOCATION MODEL ===
const AllocationSchema = new mongoose.Schema({
  employee_id: String,
  shift_id: String,
  approved: { type: Boolean, default: false }
});
const Allocation = mongoose.model('Allocation', AllocationSchema);

module.exports = {
  Shift,
  Allocation
};