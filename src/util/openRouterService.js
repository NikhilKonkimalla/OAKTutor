import { OPENROUTER_API_KEY, OPENROUTER_API_URL } from '../config/config.js';

/**
 * Generate a hint using OpenRouter API
 * @param {string} prompt - The prompt to send to the AI
 * @returns {Promise<string>} - The generated hint text
 */
export const generateHint = async (prompt) => {
    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': OPENROUTER_API_KEY,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'OAKTutor Dynamic Hints'
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful tutor that provides hints to students. Give clear, constructive hints that guide students toward the correct answer without giving it away directly. Be encouraging and educational.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            return data.choices[0].message.content.trim();
        } else {
            throw new Error('Invalid response format from OpenRouter API');
        }
    } catch (error) {
        console.error('Error generating hint:', error);
        throw error;
    }
};

/**
 * Evaluate student code using OpenRouter API
 * @param {string} problemDescription - The problem title and body
 * @param {string} stepDescription - The step title and body
 * @param {string} studentCode - The student's submitted code
 * @returns {Promise<string>} - The AI's evaluation feedback
 */
export const evaluateCode = async (problemDescription, stepDescription, studentCode) => {
    try {
        // Construct the prompt similar to the image example
        const prompt = `You are a helpful programming tutor providing feedback on a student's Python code.

The student was asked to solve this problem:
"""${problemDescription}

${stepDescription}"""

Here is the student's submitted code:
\`\`\`python
${studentCode}
\`\`\`

Evaluate the code and provide concise, easy-to-read feedback.

IMPORTANT - Keep your response SHORT and DIGESTIBLE (2-4 sentences max):

If the code is correct: Give a brief, encouraging confirmation (1-2 sentences).

If there are errors:
- Point out the main issue in 1-2 sentences
- Mention the location (line number if possible)
- Give a brief hint toward fixing it without revealing the answer
- Keep it simple and encouraging

Write as if talking to a student - friendly, clear, and concise.`;

        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': OPENROUTER_API_KEY,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'OAKTutor Code Evaluation'
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful programming tutor providing concise, easy-to-read feedback on student Python code. Keep responses short (2-4 sentences max) and digestible. Be friendly, clear, and encouraging. Focus on the main issue and provide brief guidance.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            return data.choices[0].message.content.trim();
        } else {
            throw new Error('Invalid response format from OpenRouter API');
        }
    } catch (error) {
        console.error('Error evaluating code:', error);
        throw error;
    }
};



