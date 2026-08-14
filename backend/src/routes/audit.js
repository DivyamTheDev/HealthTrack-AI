import express from 'express';
import AuditLog from '../models/AuditLog.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/audit-logs
// @desc    Retrieve system audit log trail (Clinicians / Admins only)
router.get('/', authenticateJWT, requireRole('clinician'), async (req, res) => {
  try {
    const logs = await AuditLog.find({})
      .sort({ timestamp: -1 })
      .limit(100); // return last 100 entries
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
