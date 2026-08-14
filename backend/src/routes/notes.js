import express from 'express';
import ClinicalNote from '../models/ClinicalNote.js';
import Patient from '../models/Patient.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { logAction } from '../services/auditService.js';

const router = express.Router();

// @route   POST /api/clinical-notes
// @desc    Add a clinical note (Clinician only)
router.post('/', authenticateJWT, requireRole('clinician'), async (req, res) => {
  const { patientId, note } = req.body;

  if (!patientId || !note) {
    return res.status(400).json({ error: 'Please provide patientId and note content.' });
  }

  try {
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    const clinicalNote = new ClinicalNote({
      patientId,
      clinicianId: req.user.clinicianId,
      note
    });

    await clinicalNote.save();

    await logAction(req.user, 'ADD_CLINICAL_NOTE', `Dr. added clinical note to Patient: ${patient.name} (#${patient._id})`);

    res.status(201).json(clinicalNote);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/clinical-notes/:patientId
// @desc    Get all clinical notes for a patient
router.get('/:patientId', authenticateJWT, async (req, res) => {
  const { patientId } = req.params;

  // Authorization check
  if (req.user.role === 'patient' && (!req.user.patientId || req.user.patientId.toString() !== patientId)) {
    return res.status(403).json({ error: 'Access denied. You can only view your own notes.' });
  }

  try {
    const notes = await ClinicalNote.find({ patientId })
      .populate('clinicianId', 'name specialization')
      .sort({ createdAt: -1 });

    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
