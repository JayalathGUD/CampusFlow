import express from 'express';
import { register, login, getMe, updateProfile, googleLogin } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleLogin);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

export default router;
