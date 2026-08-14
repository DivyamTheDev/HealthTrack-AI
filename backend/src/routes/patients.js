import express from 'express';
import Patient from '../models/Patient.js';
import LabResult from '../models/LabResult.js';
import Biomarker from '../models/Biomarker.js';
import ClinicalNote from '../models/ClinicalNote.js';
import AISummary from '../models/AISummary.js';
import { authenticateJWT } from '../middleware/auth.js';
import { logAction } from '../services/auditService.js';

const router = express.Router();

// Helper to check if a user is authorized to access a patient's data
const authorizePatientAccess = (req, patientIdStr) => {
  if (req.user.role === 'clinician') return true;
  if (req.user.role === 'patient' && req.user.patientId && req.user.patientId.toString() === patientIdStr) {
    return true;
  }
  return false;
};

// @route   GET /api/patients
// @desc    Get all patients assigned to a clinician
router.get('/', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'clinician') {
    return res.status(403).json({ error: 'Access denied. Clinicians only.' });
  }

  try {
    // If clinician, find all patients assigned to this clinician
    const patients = await Patient.find({ clinicianId: req.user.clinicianId });
    res.json(patients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/patients/:id
// @desc    Get patient profile details
router.get('/:id', authenticateJWT, async (req, res) => {
  const patientId = req.params.id;

  if (!authorizePatientAccess(req, patientId)) {
    return res.status(403).json({ error: 'Access denied. You can only view your own records.' });
  }

  try {
    const patient = await Patient.findById(patientId).populate('clinicianId');
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    if (req.user.role === 'clinician') {
      await logAction(req.user, 'VIEW_PATIENT', `Dr. viewed profile of Patient: ${patient.name} (#${patient._id})`);
    }

    res.json(patient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/patients/:id/results
// @desc    Get all lab results for a patient
router.get('/:id/results', authenticateJWT, async (req, res) => {
  const patientId = req.params.id;

  if (!authorizePatientAccess(req, patientId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const results = await LabResult.find({ patientId })
      .populate('biomarkerId')
      .sort({ measuredAt: -1 });
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/patients/:id/timeline
// @desc    Get combined health timeline chronologically
router.get('/:id/timeline', authenticateJWT, async (req, res) => {
  const patientId = req.params.id;

  if (!authorizePatientAccess(req, patientId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    // 1. Fetch Lab Results
    const results = await LabResult.find({ patientId }).populate('biomarkerId');
    
    // 2. Fetch Notes
    const notes = await ClinicalNote.find({ patientId }).populate('clinicianId');
    
    // 3. Fetch AI Summaries
    const summaries = await AISummary.find({ patientId }).populate('clinicianId');

    // 4. Assemble timeline items
    const timeline = [];

    // Group lab results by date to avoid cluttering the timeline
    const resultsByDate = {};
    results.forEach(r => {
      const dateStr = new Date(r.measuredAt).toISOString().split('T')[0];
      if (!resultsByDate[dateStr]) {
        resultsByDate[dateStr] = [];
      }
      resultsByDate[dateStr].push(r);
    });

    Object.entries(resultsByDate).forEach(([date, items]) => {
      timeline.push({
        id: `lab-${date}`,
        type: 'blood_test',
        date: new Date(date),
        title: 'Blood Test Completed',
        description: `Measurements recorded for ${items.map(i => i.biomarkerId?.name).join(', ')}.`,
        details: items.map(i => ({
          biomarker: i.biomarkerId?.name,
          value: i.value,
          unit: i.biomarkerId?.unit,
          referenceMin: i.biomarkerId?.referenceMin,
          referenceMax: i.biomarkerId?.referenceMax,
          isOutRange: i.value < i.biomarkerId?.referenceMin || i.value > i.biomarkerId?.referenceMax
        }))
      });
    });

    notes.forEach(n => {
      timeline.push({
        id: `note-${n._id}`,
        type: 'consultation',
        date: n.createdAt,
        title: 'Clinical Consultation',
        description: `Clinical note added by ${n.clinicianId?.name || 'Clinician'}.`,
        details: {
          note: n.note,
          doctorName: n.clinicianId?.name,
          specialization: n.clinicianId?.specialization
        }
      });
    });

    summaries.forEach(s => {
      // Only show approved or draft summaries
      timeline.push({
        id: `summary-${s._id}`,
        type: 'ai_summary',
        date: s.reviewedAt || s.createdAt,
        title: `AI Health Summary (${s.status.toUpperCase()})`,
        description: s.status === 'draft' ? 'AI generated draft awaiting review.' : `Summary reviewed and approved by ${s.clinicianId?.name || 'Clinician'}.`,
        details: {
          summary: s.editedText || s.summaryText,
          status: s.status
        }
      });
    });

    // Sort descending by date
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(timeline);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/patients/:id/biomarkers/:name
// @desc    Get historical value series of a single biomarker for chart plotting
router.get('/:id/biomarkers/:name', authenticateJWT, async (req, res) => {
  const patientId = req.params.id;
  const name = req.params.name;

  if (!authorizePatientAccess(req, patientId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const biomarker = await Biomarker.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (!biomarker) {
      return res.status(404).json({ error: `Biomarker '${name}' not found.` });
    }

    const results = await LabResult.find({ patientId, biomarkerId: biomarker._id })
      .sort({ measuredAt: 1 }); // Ascending order for chart trend lines

    res.json({
      biomarker,
      history: results.map(r => ({
        id: r._id,
        value: r.value,
        measuredAt: r.measuredAt,
        label: new Date(r.measuredAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
