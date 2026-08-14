import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Clinician from '../models/Clinician.js';
import { authenticateJWT } from '../middleware/auth.js';
import { logAction } from '../services/auditService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_healthtrack_key_2026';

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Please provide username and password' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      id: user._id,
      username: user.username,
      role: user.role,
      patientId: user.patientId,
      clinicianId: user.clinicianId
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // Logging login to audit log
    await logAction(payload, 'LOGIN', `User ${user.username} logged in successfully.`);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        patientId: user.patientId,
        clinicianId: user.clinicianId
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile details
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let profile = null;
    if (user.role === 'patient' && user.patientId) {
      profile = await Patient.findById(user.patientId).populate('clinicianId');
    } else if (user.role === 'clinician' && user.clinicianId) {
      profile = await Clinician.findById(user.clinicianId);
    }

    res.json({
      user,
      profile
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
