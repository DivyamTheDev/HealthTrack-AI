import express from 'express';
import Patient from '../models/Patient.js';
import Biomarker from '../models/Biomarker.js';
import LabResult from '../models/LabResult.js';
import ClinicalNote from '../models/ClinicalNote.js';
import AISummary from '../models/AISummary.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { generateHealthSummary } from '../services/aiService.js';
import { logAction } from '../services/auditService.js';

const router = express.Router();

// @route   POST /api/ai/summaries/:patientId
// @desc    Generate AI draft summary based on patient history
router.post('/summaries/:patientId', authenticateJWT, requireRole('clinician'), async (req, res) => {
  const { patientId } = req.params;

  try {
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    // 1. Gather all clinical data for this patient
    const biomarkers = await Biomarker.find({});
    const labResults = await LabResult.find({ patientId });
    const notes = await ClinicalNote.find({ patientId });

    // 2. Trigger AI synthesis
    const rawSummary = await generateHealthSummary(patient, biomarkers, labResults, notes);

    // 3. Save draft summary in database
    const summary = new AISummary({
      patientId,
      clinicianId: req.user.clinicianId,
      summaryText: rawSummary,
      status: 'draft'
    });

    await summary.save();

    // 4. Log audit log
    await logAction(req.user, 'GENERATE_AI_SUMMARY', `Dr. generated AI summary draft for Patient: ${patient.name} (#${patient._id})`);

    res.status(201).json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/ai/summaries/:summaryId
// @desc    Approve, edit, or reject AI summary
router.put('/summaries/:summaryId', authenticateJWT, requireRole('clinician'), async (req, res) => {
  const { summaryId } = req.params;
  const { status, editedText } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Valid status ("approved" or "rejected") is required.' });
  }

  try {
    const summary = await AISummary.findById(summaryId).populate('patientId');
    if (!summary) {
      return res.status(404).json({ error: 'AI Summary not found.' });
    }

    const patientName = summary.patientId?.name || 'Unknown';

    // Update summary fields
    summary.status = status;
    summary.reviewedAt = new Date();
    
    let isEdited = false;
    if (editedText !== undefined && editedText !== null) {
      summary.editedText = editedText;
      isEdited = true;
    }

    await summary.save();

    // Audit logs for edits and approvals/rejections
    if (isEdited) {
      await logAction(req.user, 'EDIT_AI_SUMMARY', `Dr. edited AI summary for Patient: ${patientName} (#${summary.patientId?._id})`);
    }

    const actionType = status === 'approved' ? 'APPROVE_AI_SUMMARY' : 'REJECT_AI_SUMMARY';
    await logAction(req.user, actionType, `Dr. ${status} AI summary for Patient: ${patientName} (#${summary.patientId?._id})`);

    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
