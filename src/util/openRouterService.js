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



