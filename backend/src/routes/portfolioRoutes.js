import express from 'express';
import { getPortfolio, updatePortfolio } from '../controllers/portfolioController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/:userId', getPortfolio);
router.put('/', updatePortfolio);

export default router;
