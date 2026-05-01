/**
 * Seed Indian IT company holiday calendar for 2025 and 2026.
 * Run: node src/config/seedHolidays.js
 *
 * Includes:
 *  - All national public holidays (gazetted)
 *  - IT-sector specific optional holidays
 *  - Covers both years so reports and leave logic work correctly
 *
 * Safe to re-run — skips dates that already exist.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Holiday  = require('../modules/holiday/holiday.model');

// ─── Holiday data ─────────────────────────────────────────────────────────────
// type: 'public'   → mandatory (gazetted national holiday)
//       'optional' → company-observed (IT industry standard)

const HOLIDAYS = [
  // ══════════════════════════════════════════════════════
  //  2025
  // ══════════════════════════════════════════════════════

  // Q1 2025
  { name: 'New Year\'s Day',         date: '2025-01-01', type: 'public',   desc: 'Start of the new calendar year' },
  { name: 'Makar Sankranti',         date: '2025-01-14', type: 'public',   desc: 'Harvest festival; also celebrated as Pongal / Uttarayan' },
  { name: 'Republic Day',            date: '2025-01-26', type: 'public',   desc: 'Constitution of India came into effect, 1950' },
  { name: 'Maha Shivratri',          date: '2025-02-26', type: 'optional', desc: 'Festival dedicated to Lord Shiva' },
  { name: 'Holi',                    date: '2025-03-14', type: 'public',   desc: 'Festival of colours' },

  // Q2 2025
  { name: 'Gudi Padwa / Ugadi',      date: '2025-03-30', type: 'optional', desc: 'Marathi & Telugu New Year' },
  { name: 'Ram Navami',              date: '2025-04-06', type: 'optional', desc: 'Birth anniversary of Lord Rama' },
  { name: 'Mahavir Jayanti',         date: '2025-04-10', type: 'public',   desc: 'Birth anniversary of Lord Mahavira' },
  { name: 'Good Friday',             date: '2025-04-18', type: 'public',   desc: 'Christian observance of crucifixion of Jesus Christ' },
  { name: 'Dr. Ambedkar Jayanti',    date: '2025-04-14', type: 'public',   desc: 'Birth anniversary of Dr. B. R. Ambedkar' },
  { name: 'Maharashtra Day',         date: '2025-05-01', type: 'optional', desc: 'Maharashtra state formation day / International Labour Day' },
  { name: 'Buddha Purnima',          date: '2025-05-12', type: 'public',   desc: 'Birth, enlightenment and death of Gautama Buddha' },
  { name: 'Eid-ul-Adha',            date: '2025-06-07', type: 'public',   desc: 'Festival of Sacrifice (Bakrid)' },

  // Q3 2025
  { name: 'Muharram',                date: '2025-07-06', type: 'optional', desc: 'Islamic New Year / Ashura' },
  { name: 'Independence Day',        date: '2025-08-15', type: 'public',   desc: 'India\'s Independence from British rule, 1947' },
  { name: 'Janmashtami',             date: '2025-08-16', type: 'public',   desc: 'Birth anniversary of Lord Krishna' },
  { name: 'Ganesh Chaturthi',        date: '2025-08-27', type: 'public',   desc: 'Birthday of Lord Ganesha; major festival in Maharashtra' },
  { name: 'Onam',                    date: '2025-09-05', type: 'optional', desc: 'Harvest festival of Kerala' },

  // Q4 2025
  { name: 'Gandhi Jayanti',          date: '2025-10-02', type: 'public',   desc: 'Birth anniversary of Mahatma Gandhi; National Holiday' },
  { name: 'Dussehra (Vijayadashami)',date: '2025-10-02', type: 'public',   desc: 'Victory of good over evil; end of Navratri' },
  { name: 'Diwali (Lakshmi Puja)',   date: '2025-10-20', type: 'public',   desc: 'Festival of Lights; main day of Diwali' },
  { name: 'Diwali Holiday',          date: '2025-10-21', type: 'public',   desc: 'Day after Diwali — Govardhan Puja' },
  { name: 'Bhai Dooj',               date: '2025-10-23', type: 'optional', desc: 'Sibling bonding festival, two days after Diwali' },
  { name: 'Guru Nanak Jayanti',      date: '2025-11-05', type: 'public',   desc: 'Birth anniversary of Guru Nanak Dev, founder of Sikhism' },
  { name: 'Christmas',               date: '2025-12-25', type: 'public',   desc: 'Birth of Jesus Christ' },
  { name: 'Christmas Holiday',       date: '2025-12-26', type: 'optional', desc: 'Company holiday — extended Christmas break' },

  // ══════════════════════════════════════════════════════
  //  2026
  // ══════════════════════════════════════════════════════

  // Q1 2026
  { name: 'New Year\'s Day',         date: '2026-01-01', type: 'public',   desc: 'Start of the new calendar year' },
  { name: 'Makar Sankranti',         date: '2026-01-14', type: 'public',   desc: 'Harvest festival; also Pongal / Uttarayan' },
  { name: 'Republic Day',            date: '2026-01-26', type: 'public',   desc: 'Constitution of India came into effect, 1950' },
  { name: 'Maha Shivratri',          date: '2026-02-17', type: 'optional', desc: 'Festival dedicated to Lord Shiva' },
  { name: 'Holi',                    date: '2026-03-14', type: 'public',   desc: 'Festival of colours' },

  // Q2 2026
  { name: 'Gudi Padwa / Ugadi',      date: '2026-03-19', type: 'optional', desc: 'Marathi & Telugu New Year' },
  { name: 'Good Friday',             date: '2026-04-03', type: 'public',   desc: 'Christian observance of crucifixion of Jesus Christ' },
  { name: 'Dr. Ambedkar Jayanti',    date: '2026-04-14', type: 'public',   desc: 'Birth anniversary of Dr. B. R. Ambedkar' },
  { name: 'Ram Navami',              date: '2026-03-28', type: 'optional', desc: 'Birth anniversary of Lord Rama' },
  { name: 'Maharashtra Day',         date: '2026-05-01', type: 'optional', desc: 'Maharashtra state formation day / International Labour Day' },
  { name: 'Buddha Purnima',          date: '2026-05-31', type: 'public',   desc: 'Birth, enlightenment and death of Gautama Buddha' },
  { name: 'Eid-ul-Fitr',            date: '2026-03-21', type: 'public',   desc: 'End of Ramadan — festival of breaking the fast' },
  { name: 'Eid-ul-Adha',            date: '2026-05-27', type: 'public',   desc: 'Festival of Sacrifice (Bakrid)' },

  // Q3 2026
  { name: 'Independence Day',        date: '2026-08-15', type: 'public',   desc: 'India\'s Independence from British rule, 1947' },
  { name: 'Janmashtami',             date: '2026-08-05', type: 'public',   desc: 'Birth anniversary of Lord Krishna' },
  { name: 'Ganesh Chaturthi',        date: '2026-08-16', type: 'public',   desc: 'Birthday of Lord Ganesha' },
  { name: 'Onam',                    date: '2026-08-25', type: 'optional', desc: 'Harvest festival of Kerala' },

  // Q4 2026
  { name: 'Gandhi Jayanti',          date: '2026-10-02', type: 'public',   desc: 'Birth anniversary of Mahatma Gandhi; National Holiday' },
  { name: 'Dussehra (Vijayadashami)',date: '2026-10-20', type: 'public',   desc: 'Victory of good over evil' },
  { name: 'Diwali (Lakshmi Puja)',   date: '2026-11-08', type: 'public',   desc: 'Festival of Lights — main day' },
  { name: 'Diwali Holiday',          date: '2026-11-09', type: 'public',   desc: 'Day after Diwali — Govardhan Puja' },
  { name: 'Guru Nanak Jayanti',      date: '2026-11-25', type: 'public',   desc: 'Birth anniversary of Guru Nanak Dev' },
  { name: 'Christmas',               date: '2026-12-25', type: 'public',   desc: 'Birth of Jesus Christ' },
  { name: 'Christmas Holiday',       date: '2026-12-26', type: 'optional', desc: 'Company holiday — extended Christmas break' },
  { name: 'New Year Eve',            date: '2026-12-31', type: 'optional', desc: 'Company holiday — year-end closure' },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected\n');

  let created = 0, skipped = 0, dupeDate = 0;

  for (const h of HOLIDAYS) {
    const dateObj = new Date(h.date);
    dateObj.setHours(0, 0, 0, 0);

    // Check if this date already exists
    const existing = await Holiday.findOne({
      date: { $gte: dateObj, $lt: new Date(dateObj.getTime() + 86400000) },
    });

    if (existing) {
      console.log(`  SKIP  ${h.date}  ${h.name}  (date already in DB as "${existing.name}")`);
      dupeDate++;
      skipped++;
      continue;
    }

    await Holiday.create({
      name:        h.name,
      date:        dateObj,
      type:        h.type,
      description: h.desc,
      year:        dateObj.getFullYear(),
    });

    const tag = h.type === 'public' ? '📅 PUBLIC  ' : '📌 OPTIONAL';
    console.log(`  ✓ ${tag}  ${h.date}  ${h.name}`);
    created++;
  }

  console.log('\n─────────────────────────────────────────────────────');
  console.log(`  Created  : ${created} holidays`);
  console.log(`  Skipped  : ${skipped} (already existed)`);
  console.log(`  Total    : ${HOLIDAYS.length} entries processed`);
  console.log('─────────────────────────────────────────────────────');

  // Summary by year
  const byYear = await Holiday.aggregate([
    { $group: { _id: { year: '$year', type: '$type' }, count: { $sum: 1 } } },
    { $sort:  { '_id.year': 1, '_id.type': 1 } },
  ]);
  console.log('\nCalendar summary:');
  byYear.forEach(r => console.log(`  ${r._id.year}  ${r._id.type.padEnd(8)}  ${r.count} holidays`));

  await mongoose.disconnect();
  console.log('\nDone.');
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
