import { callGeminiAPI } from '../services/aiService.js';
import AIRequest from '../models/AIRequest.js';

// @desc    Summarize notes
// @route   POST /api/ai/summarize
// @access  Private
export const summarizeNote = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Note content is required for summarization' });
    }

    const promptText = `Summarize this academic note and list the most important key bullet points and action items:\n\n${content}`;
    const result = await callGeminiAPI(promptText);

    // Audit Log request
    await AIRequest.create({
      user: req.user.id,
      type: 'summarize',
      prompt: promptText.substring(0, 500),
      response: result.substring(0, 500)
    });

    res.status(200).json({
      success: true,
      summary: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Suggest assignment structures / improvements (Assignment Assistant)
// @route   POST /api/ai/structure
// @access  Private
export const generateStructure = async (req, res, next) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Assignment title is required' });
    }

    const promptText = `Suggest a detailed academic structure, formatting outline, and research improvement ideas for this student assignment:\nTitle: ${title}\nDescription: ${description || 'No description provided'}`;
    const result = await callGeminiAPI(promptText);

    await AIRequest.create({
      user: req.user.id,
      type: 'structure',
      prompt: promptText.substring(0, 500),
      response: result.substring(0, 500)
    });

    res.status(200).json({
      success: true,
      structure: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate MCQ Quiz from notes
// @route   POST /api/ai/quiz
// @access  Private
export const generateQuiz = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Note content is required to generate a quiz' });
    }

    const promptText = `Based on these study notes, generate 3 multiple choice questions (MCQ) in JSON array format.
Each question object MUST have exactly these fields: "question" (string), "options" (array of 4 strings), "answer" (string matching the correct option exactly), and "explanation" (string explaining why it is correct).
Return ONLY the raw JSON string array without any code block formatting or backticks.
Notes: ${content}`;

    const rawResult = await callGeminiAPI(promptText);
    let quizData = [];

    try {
      // Clean up markdown block characters if Gemini API returned them despite instructions
      const cleanJson = rawResult
        .replace(/```json/gi, '')
        .replace(/```/gi, '')
        .trim();

      quizData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse AI quiz response as JSON. Returning raw string as explanation.', parseError);
      // Fallback fallback parser or empty array
      return res.status(500).json({
        success: false,
        message: 'Failed to format questions. Please make your notes more structured.',
        raw: rawResult
      });
    }

    await AIRequest.create({
      user: req.user.id,
      type: 'quiz',
      prompt: promptText.substring(0, 500),
      response: rawResult.substring(0, 500)
    });

    res.status(200).json({
      success: true,
      quiz: quizData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate flashcards from notes
// @route   POST /api/ai/flashcards
// @access  Private
export const generateFlashcards = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Note content is required to generate flashcards' });
    }

    const promptText = `Based on these study notes, generate 5 flashcards in JSON array format.
Each object in the array MUST have exactly these fields: "front" (the term or question) and "back" (the definition or explanation).
Return ONLY the raw JSON string array. Do not enclose it in markdown blocks.
Notes: ${content}`;

    const rawResult = await callGeminiAPI(promptText);
    let flashcardData = [];

    try {
      const cleanJson = rawResult
        .replace(/```json/gi, '')
        .replace(/```/gi, '')
        .trim();

      flashcardData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse AI flashcard response as JSON', parseError);
      return res.status(500).json({
        success: false,
        message: 'Failed to format flashcards. Try again.',
        raw: rawResult
      });
    }

    await AIRequest.create({
      user: req.user.id,
      type: 'flashcard',
      prompt: promptText.substring(0, 500),
      response: rawResult.substring(0, 500)
    });

    res.status(200).json({
      success: true,
      flashcards: flashcardData
    });
  } catch (error) {
    next(error);
  }
};
