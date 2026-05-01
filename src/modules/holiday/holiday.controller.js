const holidayService = require('./holiday.service');
const { validateHoliday } = require('../../utils/validation.util');

const holidayController = {
  // GET /holidays
  async index(req, res) {
    try {
      const year = req.query.year || new Date().getFullYear();
      const [holidays, availableYears] = await Promise.all([
        holidayService.getAllHolidays(year),
        holidayService.getAvailableYears(),
      ]);

      res.render('pages/holiday/index', {
        title: 'Holiday Calendar',
        holidays,
        availableYears,
        selectedYear: parseInt(year),
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /holidays/create
  async getCreate(req, res) {
    try {
      res.render('pages/holiday/create', {
        title: 'Add Holiday',
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/holidays');
    }
  },

  // POST /holidays
  async postCreate(req, res) {
    try {
      const errors = validateHoliday(req.body);
      if (errors.length) {
        req.flash('error', errors.join(', '));
        return res.redirect('/holidays/create');
      }

      await holidayService.createHoliday(req.body);
      req.flash('success', 'Holiday added successfully');
      res.redirect('/holidays');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/holidays/create');
    }
  },

  // DELETE /holidays/:id
  async deleteHoliday(req, res) {
    try {
      await holidayService.deleteHoliday(req.params.id);
      req.flash('success', 'Holiday deleted successfully');
      res.redirect('/holidays');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/holidays');
    }
  },
};

module.exports = holidayController;
