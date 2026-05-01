/**
 * Seed attendance data for all active employees.
 * Covers the last 6 months (excluding today).
 * Run: node src/config/seedAttendance.js
 *
 * Rules per working day (Mon–Fri, non-holiday):
 *   78% present    → checkIn 08:45–09:30, checkOut 17:30–19:30, 8–10 h
 *   8%  late       → checkIn 09:31–10:30, checkOut 18:00–19:00, 7.5–9 h, isLate=true
 *   5%  half-day   → checkIn 09:00–09:30, checkOut 13:00–14:00, ~4 h
 *   5%  absent     → no check-in/out
 *   4%  on-leave   → no check-in/out
 *
 * Weekends & holidays → status 'holiday', no check-in/out.
 * Already-existing records are skipped (safe to re-run).
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Employee  = require('../modules/employee/employee.model');
const Attendance = require('../modules/attendance/attendance.model');
const Holiday   = require('../modules/holiday/holiday.model');

// ─── Config ───────────────────────────────────────────────────────────────────
const MONTHS_BACK   = 6;   // how far back to generate
const BATCH_SIZE    = 500; // insertMany batch size

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Random int in [min, max] */
const rInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Random float rounded to 2dp in [min, max] */
const rFloat = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;

/** Build a Date on the given day with specific hour+minute */
const dayAt = (base, h, m) => {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
};

/** Midnight of a Date (strips time) */
const midnight = (d) => {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
};

/** Returns a Set of 'YYYY-MM-DD' strings for public holidays */
function buildHolidaySet(holidays) {
  const set = new Set();
  holidays.forEach(h => {
    const d = new Date(h.date);
    set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  });
  return set;
}

/** YYYY-MM-DD string from a Date */
const toKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

/** Build one attendance document for a given employee + date */
function buildRecord(employeeId, date, holidaySet) {
  const key  = toKey(date);
  const dow  = date.getDay(); // 0=Sun, 6=Sat
  const isWeekend  = dow === 0 || dow === 6;
  const isHoliday  = holidaySet.has(key);

  if (isWeekend || isHoliday) {
    return {
      employeeId,
      date: midnight(date),
      status: 'holiday',
      checkIn: null, checkOut: null,
      workHours: 0, isLate: false, overtime: 0,
      markedBy: 'hr',
    };
  }

  // Weighted pick for working days
  const roll = Math.random();
  let status, checkIn = null, checkOut = null, workHours = 0, isLate = false, overtime = 0;

  if (roll < 0.78) {
    // Present
    status  = 'present';
    const inH  = 8, inM  = rInt(45, 60) % 60 === 0 ? rInt(45,59) : rInt(45,59);
    const inMin = rInt(45, 74); // 08:45 – 09:14
    checkIn  = dayAt(date, 8 + Math.floor(inMin / 60), inMin % 60);
    const outH = rInt(17, 19), outM = rInt(30, 59);
    checkOut = dayAt(date, outH, outM);
    workHours = rFloat(8, 10);
    overtime  = workHours > 9 ? rFloat(0.5, workHours - 9) : 0;

  } else if (roll < 0.86) {
    // Late
    status  = 'late';
    isLate  = true;
    const inMin = rInt(91, 150); // 09:31 – 10:30  (relative to 08:00)
    checkIn  = dayAt(date, 8 + Math.floor(inMin / 60), inMin % 60);
    checkOut = dayAt(date, rInt(17,19), rInt(0,59));
    workHours = rFloat(7, 9);

  } else if (roll < 0.91) {
    // Half-day
    status  = 'half-day';
    checkIn  = dayAt(date, 9, rInt(0, 30));
    checkOut = dayAt(date, 13, rInt(0, 59));
    workHours = rFloat(3.5, 4.5);

  } else if (roll < 0.96) {
    // Absent
    status = 'absent';

  } else {
    // On-leave
    status = 'on-leave';
  }

  return {
    employeeId,
    date:      midnight(date),
    status,
    checkIn,
    checkOut,
    workHours: Math.round(workHours * 100) / 100,
    isLate,
    overtime:  Math.round(overtime * 100) / 100,
    markedBy:  'hr',
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected\n');

  // Load reference data
  const [employees, holidays] = await Promise.all([
    Employee.find({ status: 'active' }, '_id employeeCode firstName lastName').lean(),
    Holiday.find({}).lean(),
  ]);

  console.log(`Employees : ${employees.length}`);
  console.log(`Holidays  : ${holidays.length}`);

  const holidaySet = buildHolidaySet(holidays);

  // Date range: start of month, MONTHS_BACK ago → yesterday
  const today     = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - MONTHS_BACK);
  startDate.setDate(1);

  const endDate   = new Date(today);
  endDate.setDate(endDate.getDate() - 1); // yesterday

  console.log(`Date range: ${toKey(startDate)}  →  ${toKey(endDate)}`);

  // Build list of all dates in range
  const allDates = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    allDates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  console.log(`Total days: ${allDates.length}`);
  console.log(`Generating records for ${employees.length} employees × ${allDates.length} days…\n`);

  // Find already-existing (employeeId, date) pairs to skip
  console.log('Loading existing records to skip duplicates…');
  const existing = await Attendance.find(
    { date: { $gte: startDate, $lte: endDate } },
    { employeeId: 1, date: 1, _id: 0 }
  ).lean();
  const existingSet = new Set(
    existing.map(r => `${r.employeeId}_${toKey(new Date(r.date))}`)
  );
  console.log(`  → ${existingSet.size} existing records will be skipped\n`);

  let totalInserted = 0;
  let totalSkipped  = 0;
  let batch         = [];

  for (const emp of employees) {
    let empInserted = 0;
    for (const date of allDates) {
      const key = `${emp._id}_${toKey(date)}`;
      if (existingSet.has(key)) { totalSkipped++; continue; }

      batch.push(buildRecord(emp._id, date, holidaySet));

      if (batch.length >= BATCH_SIZE) {
        await Attendance.insertMany(batch, { ordered: false });
        totalInserted += batch.length;
        empInserted   += batch.length;
        batch = [];
      }
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    await Attendance.insertMany(batch, { ordered: false });
    totalInserted += batch.length;
  }

  console.log('─────────────────────────────────────────');
  console.log(`Inserted : ${totalInserted.toLocaleString()} records`);
  console.log(`Skipped  : ${totalSkipped.toLocaleString()} (already existed)`);
  console.log(`Total    : ${(totalInserted + totalSkipped).toLocaleString()} records`);
  console.log('─────────────────────────────────────────');

  await mongoose.disconnect();
  console.log('\nDone.');
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
