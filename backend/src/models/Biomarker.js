import mongoose from 'mongoose';

const biomarkerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  referenceMin: {
    type: Number,
    required: true
  },
  referenceMax: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

const Biomarker = mongoose.model('Biomarker', biomarkerSchema);
export default Biomarker;
