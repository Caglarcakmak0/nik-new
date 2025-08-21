/* Dev seed: creates a coach and a student if they don't exist, and assigns the coach to the student. */
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Users = require('../models/Users');
const CoachStudent = require('../models/CoachStudent');

async function main() {
  const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/yks-portal';
  await mongoose.connect(mongoUrl);
  console.log('Connected MongoDb for seeding');

  const coachEmail = 'coach@nik.dev';
  const studentEmail = 'student@nik.dev';
  const password = '123456';
  const hashed = await bcryptjs.hash(password, 10);

  let coach = await Users.findOne({ email: coachEmail });
  if (!coach) {
    coach = await Users.create({ email: coachEmail, password: hashed, role: 'coach', firstName: 'Koç', lastName: 'Test' });
    console.log('Created coach:', coachEmail);
  } else {
    console.log('Coach exists:', coachEmail);
  }

  let student = await Users.findOne({ email: studentEmail });
  if (!student) {
    student = await Users.create({ email: studentEmail, password: hashed, role: 'student', firstName: 'Öğrenci', lastName: 'Test' });
    console.log('Created student:', studentEmail);
  } else {
    console.log('Student exists:', studentEmail);
  }

  const relation = await CoachStudent.findOne({ coachId: coach._id, studentId: student._id });
  if (!relation) {
    await CoachStudent.create({ coachId: coach._id, studentId: student._id, status: 'active' });
    console.log('Assigned coach to student');
  } else {
    console.log('Coach already assigned to student');
  }

  console.log('\nCredentials');
  console.log('Coach:', coachEmail, password);
  console.log('Student:', studentEmail, password);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });


