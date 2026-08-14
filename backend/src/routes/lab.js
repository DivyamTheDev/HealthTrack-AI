import express from 'express';
import Patient from '../models/Patient.js';
import Biomarker from '../models/Biomarker.js';
import LabResult from '../models/LabResult.js';
import { logAction } from '../services/auditService.js';

const router = express.Router();

// @route   POST /api/lab/webhook
// @desc    Simulate external laboratory sending biomarker results
router.post('/webhook', async (req, res) => {
  const { patientId, test, value, unit, date } = req.body;

  // 1. Basic validation
  if (!patientId || !test || value === undefined) {
    return res.status(400).json({ error: 'Missing required fields: patientId, test, value' });
  }

  try {
    // 2. Validate patient existence
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ error: `Patient with ID ${patientId} not found.` });
    }

    // 3. Find or create the biomarker configuration
    let biomarker = await Biomarker.findOne({ name: { $regex: new RegExp(`^${test}$`, 'i') } });
    if (!biomarker) {
      // If biomarker is new, create a default configuration
      biomarker = new Biomarker({
        name: test.toUpperCase(),
        unit: unit || 'units',
        referenceMin: 0,
        referenceMax: 100 // default dummy range
      });
      await biomarker.save();
    }

    // 4. Create and save the new Lab Result
    const labResult = new LabResult({
      patientId,
      biomarkerId: biomarker._id,
      value: parseFloat(value),
      measuredAt: date ? new Date(date) : new Date()
    });

    await labResult.save();

    // 5. Log the ingestion to the system audit trail
    await logAction(
      null, // SYSTEM actor
      'LAB_INTEGRATION_WEBHOOK',
      `Webhook ingested clinical result for Patient ${patient.name} (#${patient._id}). Biomarker: ${biomarker.name}, Value: ${value} ${biomarker.unit}.`
    );

    res.status(201).json({
      message: 'Lab result ingested successfully.',
      data: labResult
    });
  } catch (error) {
    console.error('Error handling lab webhook:', error);
    res.status(500).json({ error: 'Server error during ingestion' });
  }
});

export default router;
