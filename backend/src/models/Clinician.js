import mongoose from 'mongoose';

const clinicianSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  specialization: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

const Clinician = mongoose.model('Clinician', clinicianSchema);
export default Clinician;
