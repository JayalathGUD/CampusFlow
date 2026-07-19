import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/campusflow';

const seedAdmin = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@campusflow.com';
    const adminExists = await User.findOne({ email: adminEmail });

    if (adminExists) {
      console.log(`Admin user with email ${adminEmail} already exists. Setting role to admin...`);
      adminExists.role = 'admin';
      await adminExists.save();
      console.log('Role updated to admin successfully!');
    } else {
      const adminUser = await User.create({
        fullName: 'System Admin',
        email: adminEmail,
        password: 'admin123',
        role: 'admin',
        isVerified: true,
        university: 'CampusFlow University',
        degreeProgram: 'Systems Administration',
        academicYear: 'Staff'
      });
      console.log('Admin user created successfully!');
      console.log('Email:', adminEmail);
      console.log('Password: admin123');
    }

    // List all users for convenience
    const users = await User.find({}, 'fullName email role');
    console.log('\nCurrent users in database:');
    users.forEach(u => console.log(`- ${u.fullName} (${u.email}) [Role: ${u.role}]`));

  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

seedAdmin();
