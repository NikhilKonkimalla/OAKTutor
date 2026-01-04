import React, { useState, useContext } from 'react';
import { Button, CircularProgress, Box, Typography, Paper } from '@material-ui/core';
import HelpIcon from '@material-ui/icons/Help';
import { generateHint } from '../../util/openRouterService';
import { ThemeContext } from '../../config/config';

/**
 * Component for generating dynamic AI hints
 * @param {Object} props
 * @param {string} props.userAnswer - Current user input/answer
 * @param {string|Array} props.correctAnswer - Correct answer (or test cases for coding)
 * @param {string} props.problemStatement - Problem title + body
 * @param {string} props.stepStatement - Step title + body
 * @param {string} props.lessonContext - Course name > Lesson name: Topics
 * @param {string} props.problemType - Type of problem (TextBox, Coding, MultipleChoice, etc.)
 * @param {string} props.problemID - Problem ID for logging
 * @param {string} props.stepID - Step ID for logging
 * @param {string} props.courseName - Course name for logging
 * @param {string} props.lesson - Lesson identifier for logging
 */
const DynamicHintButton = ({
    userAnswer,
    correctAnswer,
    problemStatement,
    stepStatement,
    lessonContext,
    problemType,
    problemID,
    stepID,
    courseName,
    lesson
}) => {
    const context = useContext(ThemeContext);
    const [hint, setHint] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [hintRequestCount, setHintRequestCount] = useState(0);

    // Check if user has provided any input
    const hasInput = userAnswer && userAnswer.trim().length > 0;

    // Format test cases for coding problems
    const formatTestCases = (testCases) => {
        if (!testCases || !Array.isArray(testCases)) {
            return 'No test cases provided';
        }
        return testCases.map((tc, idx) => {
            const input = tc.input || 'N/A';
            const expected = tc.expectedOutput || 'N/A';
            return `Test ${idx + 1}: Input: ${input}, Expected Output: ${expected}`;
        }).join('\n');
    };

    // Build the prompt based on problem type
    const buildPrompt = () => {
        // Convert to strings safely
        const contextStr = String(lessonContext || '');
        const problemStr = String(problemStatement || '');
        const stepStr = String(stepStatement || '');
        
        let prompt = `Context: ${contextStr}\n\n`;
        prompt += `Problem: ${problemStr}\n\n`;
        prompt += `Step: ${stepStr}\n\n`;

        if (problemType === 'Coding') {
            prompt += `The student has provided the following code:\n${userAnswer}\n\n`;
            prompt += `The test cases that the code should pass are:\n${formatTestCases(correctAnswer)}\n\n`;
            prompt += `Please provide a helpful hint that guides the student toward writing code that passes these test cases without giving away the solution directly.`;
        } else {
            prompt += `The student has provided the following answer:\n${userAnswer}\n\n`;
            const correctAnswerStr = Array.isArray(correctAnswer) 
                ? correctAnswer.join(', ') 
                : String(correctAnswer);
            prompt += `The correct answer should be:\n${correctAnswerStr}\n\n`;
            prompt += `Please provide a helpful hint that guides the student toward the correct answer without giving it away directly.`;
        }

        return prompt;
    };

    const handleGetHint = async () => {
        if (!hasInput) {
            return;
        }

        setIsLoading(true);
        setError('');
        setHint('');
        
        // Increment hint request count
        const currentRequestNumber = hintRequestCount + 1;
        setHintRequestCount(currentRequestNumber);

        // Log hint request to Firebase BEFORE generating
        const prompt = buildPrompt();
        if (context?.firebase && context.firebase.logHintRequest) {
            try {
                console.log("🔍 Logging AI hint generation request:", {
                    problemID: problemID || "n/a",
                    stepID: stepID || "n/a",
                    hintNumber: currentRequestNumber,
                    userAnswer: userAnswer?.substring(0, 100) // First 100 chars for debugging
                });
                
                // Log the request (hint content will be null since it hasn't been generated yet)
                context.firebase.logHintRequest(
                    problemID || "n/a",
                    stepID || "n/a",
                    `ai-hint-request-${currentRequestNumber}`,
                    null, // hintContent - will be null for request
                    "AI Generated Hint Request", // hintTitle
                    "dynamic", // hintType
                    currentRequestNumber,
                    courseName || "n/a",
                    lesson || "n/a"
                ).catch((logError) => {
                    console.error("Failed to log hint request:", logError);
                });
            } catch (logError) {
                console.error("Error logging hint request:", logError);
            }
        }

        try {
            const generatedHint = await generateHint(prompt);
            setHint(generatedHint);
            
            // Log successful hint generation with the hint content
            if (context?.firebase && context.firebase.logHintRequest) {
                try {
                    console.log("✅ Logging successful AI hint generation:", {
                        problemID: problemID || "n/a",
                        stepID: stepID || "n/a",
                        hintNumber: currentRequestNumber,
                        hintLength: generatedHint?.length || 0
                    });
                    
                    context.firebase.logHintRequest(
                        problemID || "n/a",
                        stepID || "n/a",
                        `ai-hint-generated-${currentRequestNumber}`,
                        generatedHint, // hintContent - the actual generated hint
                        "AI Generated Hint", // hintTitle
                        "dynamic", // hintType
                        currentRequestNumber,
                        courseName || "n/a",
                        lesson || "n/a"
                    ).catch((logError) => {
                        console.error("Failed to log hint generation:", logError);
                    });
                } catch (logError) {
                    console.error("Error logging hint generation:", logError);
                }
            }
        } catch (err) {
            console.error('Error generating hint:', err);
            setError('Failed to generate hint. Please try again.');
            
            // Log failed hint generation attempt
            if (context?.firebase && context.firebase.logHintRequest) {
                try {
                    context.firebase.logHintRequest(
                        problemID || "n/a",
                        stepID || "n/a",
                        `ai-hint-failed-${currentRequestNumber}`,
                        `Error: ${err.message}`, // hintContent - error message
                        "AI Hint Generation Failed", // hintTitle
                        "dynamic", // hintType
                        currentRequestNumber,
                        courseName || "n/a",
                        lesson || "n/a"
                    ).catch((logError) => {
                        console.error("Failed to log hint failure:", logError);
                    });
                } catch (logError) {
                    console.error("Error logging hint failure:", logError);
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box style={{ marginBottom: '16px', marginTop: '8px' }}>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={isLoading ? <CircularProgress size={16} /> : <HelpIcon />}
                    onClick={handleGetHint}
                    disabled={!hasInput || isLoading}
                    style={{
                        minWidth: '150px',
                        backgroundColor: hasInput && !isLoading ? '#1976d2' : '#cccccc',
                        color: hasInput && !isLoading ? '#ffffff' : '#666666'
                    }}
                >
                    {isLoading ? 'Generating...' : 'Get Hint'}
                </Button>
                
                {hint && (
                    <Paper 
                        style={{ 
                            padding: '12px 16px', 
                            flex: 1,
                            minWidth: '300px',
                            backgroundColor: '#fff9e6',
                            border: '1px solid #ffd700'
                        }}
                    >
                        <Typography variant="body2" style={{ color: '#333' }}>
                            <strong>Hint:</strong> {hint}
                        </Typography>
                    </Paper>
                )}
                
                {error && (
                    <Typography variant="body2" color="error" style={{ flex: 1 }}>
                        {error}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default DynamicHintButton;

