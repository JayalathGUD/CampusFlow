import express from 'express';
import {
  summarizeNote,
  generateStructure,
  generateQuiz,
  generateFlashcards
} from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/summarize', summarizeNote);
router.post('/structure', generateStructure);
router.post('/quiz', generateQuiz);
router.post('/flashcards', generateFlashcards);

export default router;
