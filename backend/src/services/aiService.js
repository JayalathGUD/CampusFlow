import dotenv from 'dotenv';
dotenv.config();

/**
 * AI Service using standard Google Gemini API endpoints.
 */
export const callGeminiAPI = async (promptText) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.includes('your_gemini_api_key')) {
    console.warn('GEMINI_API_KEY is not configured. Returning local simulated AI response.');
    return simulateAIResponse(promptText);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('Gemini API returned an empty response.');
    }

    return generatedText;
  } catch (error) {
    console.error('Gemini API Integration Error:', error);
    return simulateAIResponse(promptText);
  }
};

/**
 * Fallback local response generator when API key is missing or calls fail.
 */
const simulateAIResponse = (promptText) => {
  const prompt = promptText.toLowerCase();

  if (prompt.includes('summar') || prompt.includes('key points')) {
    return `### Note Summary (Simulated AI)

Based on your note contents, here is a structured summary:
- **Core Subject**: Academic collaborative review.
- **Key Takeaways**:
  1. Systematic planning improves study group productivity.
  2. Integration of collaborative task boards reduces project overlap.
  3. Continuous testing ensures codebase reliability.

- **Recommended Action Items**: Review references, write tests, and update milestones regularly.`;
  }

  if (prompt.includes('structure') || prompt.includes('improve')) {
    return `### Assignment Outline & Structure (Simulated AI)

1. **Title Page / Header**: Clear project name, group members, and course code.
2. **Introduction**: Brief context and problem formulation.
3. **Literature Review**: Comparison of existing platforms (Trello, Slack, Google Docs).
4. **Proposed Methodology**: Software architecture, backend API configurations, and user experience.
5. **Implementation & Details**: Code snippets and state-slice workflows.
6. **Conclusion & Future Directions**: Project summary, limitations, and future improvements.

*Suggestion: Add a section detailing Socket.IO connection handling to secure extra technical credits.*`;
  }

  if (prompt.includes('quiz') || prompt.includes('mcq')) {
    return JSON.stringify([
      {
        question: 'Which technology is used in CampusFlow for real-time WebSocket communication?',
        options: ['REST APIs', 'Socket.IO', 'GraphQL Subscriptions', 'gRPC'],
        answer: 'Socket.IO',
        explanation: 'Socket.IO provides low-latency, bidirectional communications for instant messages and sync.'
      },
      {
        question: 'What database is selected for flexible schema design and fast document retrieval?',
        options: ['PostgreSQL', 'Redis', 'MongoDB', 'SQLite'],
        answer: 'MongoDB',
        explanation: 'MongoDB is a document database suitable for complex relational mapping with dynamic documents.'
      }
    ], null, 2);
  }

  if (prompt.includes('flashcard')) {
    return JSON.stringify([
      {
        front: 'JWT (JSON Web Token)',
        back: 'A stateless authentication mechanism that stores claims as a signed JSON object.'
      },
      {
        front: 'Redux Toolkit Store',
        back: 'A centralized frontend state repository providing predictable state updates.'
      },
      {
        front: 'Mongoose Pre-Save Hook',
        back: 'A middleware that runs in MongoDB before a document is persisted, useful for password hashing.'
      }
    ], null, 2);
  }

  return `### CampusFlow AI Assistant (Simulated Response)
This is a simulated AI response answering your request:
"${promptText.substring(0, 100)}..."`;
};
