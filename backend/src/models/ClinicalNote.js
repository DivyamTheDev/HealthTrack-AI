import mongoose from 'mongoose';

const clinicalNoteSchema = new mongoose.Schema({
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
  note: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

const ClinicalNote = mongoose.model('ClinicalNote', clinicalNoteSchema);
export default ClinicalNote;
