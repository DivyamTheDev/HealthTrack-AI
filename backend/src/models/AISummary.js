import mongoose from 'mongoose';

const aiSummarySchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  clinicianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinician',
    required: true
  },
  summaryText: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['draft', 'approved', 'rejected'],
    default: 'draft'
  },
  editedText: {
    type: String,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const AISummary = mongoose.model('AISummary', aiSummarySchema);
export default AISummary;
