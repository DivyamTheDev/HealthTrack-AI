import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import dns from 'node:dns';

// Fix for SRV DNS resolution failures on some local networks
dns.setServers(['8.8.8.8', '1.1.1.1']);

import User from './models/User.js';
import Patient from './models/Patient.js';
import Clinician from './models/Clinician.js';
import Biomarker from './models/Biomarker.js';
import LabResult from './models/LabResult.js';
import ClinicalNote from './models/ClinicalNote.js';
import AISummary from './models/AISummary.js';
import AuditLog from './models/AuditLog.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const seed = async () => {
  if (!MONGO_URI) {
    console.error('MONGO_URI is missing from environment variables.');
    process.exit(1);
  }

  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected. Cleaning database collections...');

    // Clear all existing data
    await User.deleteMany({});
    await Patient.deleteMany({});
    await Clinician.deleteMany({});
    await Biomarker.deleteMany({});
    await LabResult.deleteMany({});
    await ClinicalNote.deleteMany({});
    await AISummary.deleteMany({});
    await AuditLog.deleteMany({});

    console.log('Database cleaned.');

    // 1. Create Biomarkers
    console.log('Seeding Biomarkers...');
    const ldl = await new Biomarker({ name: 'LDL', unit: 'mg/dL', referenceMin: 0, referenceMax: 100 }).save();
    const vitD = await new Biomarker({ name: 'Vitamin D', unit: 'ng/mL', referenceMin: 30, referenceMax: 100 }).save();
    const hba1c = await new Biomarker({ name: 'HbA1c', unit: '%', referenceMin: 4.0, referenceMax: 5.6 }).save();
    console.log('Biomarkers seeded.');

    // 2. Create Clinician
    console.log('Seeding Clinicians...');
    const doctor = await new Clinician({
      name: 'Dr. Sarah Smith',
      email: 'smith@healthtrack.ai',
      specialization: 'Cardiology & Preventive Medicine'
    }).save();
    console.log('Clinician seeded.');

    // 3. Create Patients
    console.log('Seeding Patients...');
    const pDivyam = await new Patient({
      name: 'Divyam',
      dateOfBirth: new Date('1995-10-15'),
      email: 'divyam@gmail.com',
      clinicianId: doctor._id
    }).save();

    const pJohn = await new Patient({
      name: 'John Smith',
      dateOfBirth: new Date('1990-05-12'),
      email: 'john@gmail.com',
      clinicianId: doctor._id
    }).save();

    const pSarah = await new Patient({
      name: 'Sarah Jones',
      dateOfBirth: new Date('1998-02-20'),
      email: 'sarah@gmail.com',
      clinicianId: doctor._id
    }).save();

    const pAlex = await new Patient({
      name: 'Alex Brown',
      dateOfBirth: new Date('1983-11-30'),
      email: 'alex@gmail.com',
      clinicianId: doctor._id
    }).save();
    console.log('Patients seeded.');

    // 4. Create Users (Credentials)
    console.log('Seeding Users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Doctor user
    await new User({
      username: 'dr_smith',
      email: 'smith@healthtrack.ai',
      passwordHash: hashedPassword,
      role: 'clinician',
      clinicianId: doctor._id
    }).save();

    // Patient users
    await new User({
      username: 'divyam',
      email: 'divyam@gmail.com',
      passwordHash: hashedPassword,
      role: 'patient',
      patientId: pDivyam._id
    }).save();

    await new User({
      username: 'john_smith',
      email: 'john@gmail.com',
      passwordHash: hashedPassword,
      role: 'patient',
      patientId: pJohn._id
    }).save();

    await new User({
      username: 'sarah_jones',
      email: 'sarah@gmail.com',
      passwordHash: hashedPassword,
      role: 'patient',
      patientId: pSarah._id
    }).save();

    await new User({
      username: 'alex_brown',
      email: 'alex@gmail.com',
      passwordHash: hashedPassword,
      role: 'patient',
      patientId: pAlex._id
    }).save();
    console.log('Users seeded.');

    // 5. Create Lab Results (Chronological trends)
    console.log('Seeding Lab Results for Divyam...');
    // Jan 2026
    await new LabResult({ patientId: pDivyam._id, biomarkerId: ldl._id, value: 110, measuredAt: new Date('2026-01-10') }).save();
    await new LabResult({ patientId: pDivyam._id, biomarkerId: vitD._id, value: 21, measuredAt: new Date('2026-01-10') }).save();
    await new LabResult({ patientId: pDivyam._id, biomarkerId: hba1c._id, value: 5.2, measuredAt: new Date('2026-01-10') }).save();

    // Apr 2026
    await new LabResult({ patientId: pDivyam._id, biomarkerId: ldl._id, value: 119, measuredAt: new Date('2026-04-12') }).save();
    await new LabResult({ patientId: pDivyam._id, biomarkerId: vitD._id, value: 27, measuredAt: new Date('2026-04-12') }).save();
    await new LabResult({ patientId: pDivyam._id, biomarkerId: hba1c._id, value: 5.3, measuredAt: new Date('2026-04-12') }).save();

    // Aug 2026
    await new LabResult({ patientId: pDivyam._id, biomarkerId: ldl._id, value: 128, measuredAt: new Date('2026-08-10') }).save();
    await new LabResult({ patientId: pDivyam._id, biomarkerId: vitD._id, value: 34, measuredAt: new Date('2026-08-10') }).save();
    await new LabResult({ patientId: pDivyam._id, biomarkerId: hba1c._id, value: 5.4, measuredAt: new Date('2026-08-10') }).save();

    console.log('Seeding Lab Results for John Smith...');
    // Jan 2026
    await new LabResult({ patientId: pJohn._id, biomarkerId: ldl._id, value: 130, measuredAt: new Date('2026-01-15') }).save();
    await new LabResult({ patientId: pJohn._id, biomarkerId: vitD._id, value: 18, measuredAt: new Date('2026-01-15') }).save();
    await new LabResult({ patientId: pJohn._id, biomarkerId: hba1c._id, value: 5.7, measuredAt: new Date('2026-01-15') }).save();

    // Apr 2026
    await new LabResult({ patientId: pJohn._id, biomarkerId: ldl._id, value: 125, measuredAt: new Date('2026-04-15') }).save();
    await new LabResult({ patientId: pJohn._id, biomarkerId: vitD._id, value: 22, measuredAt: new Date('2026-04-15') }).save();
    await new LabResult({ patientId: pJohn._id, biomarkerId: hba1c._id, value: 5.6, measuredAt: new Date('2026-04-15') }).save();

    console.log('Lab results seeded.');

    // 6. Create Clinical Notes
    console.log('Seeding Clinical Notes...');
    await new ClinicalNote({
      patientId: pDivyam._id,
      clinicianId: doctor._id,
      note: 'Discussed rising LDL levels. Patient is moderately active but diet is high in saturated fats. Recommended decreasing butter intake and adding cardiovascular exercise 3 times a week. Re-check lipid profile in 4 months.',
      createdAt: new Date('2026-04-15')
    }).save();

    await new ClinicalNote({
      patientId: pDivyam._id,
      clinicianId: doctor._id,
      note: 'Vitamin D supplementation started (2000 IU daily) due to insufficiency. Patient reports slight muscle aches, which should improve as vit D levels recover.',
      createdAt: new Date('2026-01-18')
    }).save();
    console.log('Clinical notes seeded.');

    // 7. Create AI Summary Draft
    console.log('Seeding AI summary...');
    await new AISummary({
      patientId: pDivyam._id,
      clinicianId: doctor._id,
      summaryText: `Summary:
LDL levels are showing a slow but steady upward trend, while Vitamin D levels are steadily recovering but remain low. HbA1c is stable.

Observed trends:
- LDL: gradual increase (110 mg/dL to 128 mg/dL)
- Vitamin D: improving (21 ng/mL to 34 ng/mL)
- HbA1c: stable (5.2% to 5.4%)

Items for clinician review:
- LDL is above reference max (100 mg/dL) and rising
- Vitamin D has crossed into the sufficient range (>30 ng/mL) but requires monitoring`,
      status: 'draft'
    }).save();
    console.log('AI summary seeded.');

    // 8. Create Audit Logs
    console.log('Seeding Audit Logs...');
    await new AuditLog({
      action: 'SYSTEM_SEED',
      username: 'SYSTEM',
      role: 'SYSTEM',
      details: 'Initial database seed completed successfully.'
    }).save();
    console.log('Audit logs seeded.');

    console.log('Database Seeding Completed Successfully! 🌱');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
