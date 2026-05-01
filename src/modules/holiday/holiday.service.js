const Holiday = require('./holiday.model');
const errorCodes = require('../../utils/errorCodes.util');
const { toMidnight } = require('../../utils/helper.util');

const holidayService = {
  // ─── List holidays by year ──────────────────────────────────────────────────
  async getAllHolidays(year) {
    const targetYear = parseInt(year) || new Date().getFullYear();
    return await Holiday.find({ year: targetYear }).sort({ date: 1 }).lean();
  },

  // ─── Create holiday ─────────────────────────────────────────────────────────
  async createHoliday(data) {
    const dateObj = toMidnight(data.date);

    // Check for duplicate date
    const existing = await Holiday.findOne({
      date: {
        $gte: dateObj,
        $lt: new Date(dateObj.getTime() + 24 * 60 * 60 * 1000),
      },
    });
    if (existing) throw new Error(errorCodes.HOLIDAY_EXISTS);

    // Auto-set year
    data.year = dateObj.getFullYear();
    data.date = dateObj;

    return await Holiday.create(data);
  },

  // ─── Delete holiday ─────────────────────────────────────────────────────────
  async deleteHoliday(id) {
    const holiday = await Holiday.findByIdAndDelete(id);
    if (!holiday) throw new Error(errorCodes.NOT_FOUND);
    return holiday;
  },

  // ─── Upcoming holidays (used by dashboard) ──────────────────────────────────
  async getUpcomingHolidays(limit) {
    const today = toMidnight(new Date());
    return await Holiday.find({ date: { $gte: today } })
      .sort({ date: 1 })
      .limit(limit || 5)
      .lean();
  },

  // ─── Holidays in a date range (used by leave service) ──────────────────────
  async getHolidaysByDateRange(startDate, endDate) {
    return await Holiday.find({
      date: {
        $gte: toMidnight(startDate),
        $lte: new Date(toMidnight(endDate).getTime() + 24 * 60 * 60 * 1000 - 1),
      },
    })
      .sort({ date: 1 })
      .lean();
  },

  // ─── Available years (for dropdown) ────────────────────────────────────────
  async getAvailableYears() {
    const results = await Holiday.distinct('year');
    const currentYear = new Date().getFullYear();
    if (!results.includes(currentYear)) results.push(currentYear);
    if (!results.includes(currentYear + 1)) results.push(currentYear + 1);
    return results.sort((a, b) => b - a);
  },
};

module.exports = holidayService;
