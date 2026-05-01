const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected → ${conn.connection.host}`);
    await seedAdmin();
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

const seedAdmin = async () => {
  try {
    // Models are loaded after connection, so require here to avoid early-init issues
    const User = require('../modules/auth/user.model');
    const Employee = require('../modules/employee/employee.model');

    const adminExists = await User.findOne({ email: 'admin@hrms.com' });
    if (adminExists) return;

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('Admin@123', 12);

    const adminEmployee = await Employee.create({
      employeeCode: 'EMP001',
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@hrms.com',
      phone: '9999999999',
      gender: 'other',
      dateOfBirth: new Date('1990-01-01'),
      joiningDate: new Date(),
      designation: 'System Administrator',
      role: 'admin',
      status: 'active',
      address: 'Head Office',
    });

    await User.create({
      employeeId: adminEmployee._id,
      email: 'admin@hrms.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    });

    console.log('Seed → Admin created: admin@hrms.com / Admin@123');
  } catch (err) {
    // Duplicate key = already seeded; ignore silently
    if (err.code === 11000) return;
    console.error('Seed error:', err.message);
  }
};

module.exports = connectDB;
