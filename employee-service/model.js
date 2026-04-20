const mongoose = require('mongoose');

// === SHIFT MODEL ===
const ShiftSchema = new mongoose.Schema({
  date: String,
  time: String
});
const Shift = mongoose.model('Shift', ShiftSchema);

// === ALLOCATION MODEL ===
const AllocationSchema = new mongoose.Schema({
  employee_id: String,
  shift_id: String
});
const Allocation = mongoose.model('Allocation', AllocationSchema);

// === CLOCKIN MODEL ===
const ClockinSchema = new mongoose.Schema({
  employee_id: String,
  shift_id: String,
  clock_in: String,
  clock_out: String
});
const Clockin = mongoose.model('Clockin', ClockinSchema);

module.exports = {
  Shift,
  Allocation,
  Clockin
};