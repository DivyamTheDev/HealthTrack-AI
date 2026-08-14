import mongoose from 'mongoose';

const labResultSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  biomarkerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Biomarker',
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  measuredAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true
});

const LabResult = mongoose.model('LabResult', labResultSchema);
export default LabResult;
