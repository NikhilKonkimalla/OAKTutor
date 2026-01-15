import React, { useEffect, useRef, useState, useContext } from "react";
import { Box, Button, Typography, Paper, CircularProgress, TextField } from "@material-ui/core";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import CheckIcon from "@material-ui/icons/Check";
import CloseIcon from "@material-ui/icons/Close";
import { stagingProp } from "../../util/addStagingProperty";
import { ThemeContext } from "../../config/config";
import { evaluateCode } from "../../util/openRouterService";

const styles = {
  editorContainer: {
    border: "2px solid #d0d0d0",
    borderRadius: "8px",
    overflow: "hidden",
    marginBottom: "16px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  editorHeader: {
    backgroundColor: "#f8f9fa",
    padding: "12px",
    borderBottom: "2px solid #d0d0d0",
  },
  editorContent: {
    padding: "12px",
  },
  codeTextarea: {
    width: "100%",
    minHeight: "300px",
    fontFamily: "monospace",
    fontSize: "14px",
    padding: "12px",
    border: "1px solid #d0d0d0",
    borderRadius: "4px",
    resize: "vertical",
    lineHeight: "1.5",
  },
  evaluateButton: {
    marginTop: "12px",
    marginBottom: "12px",
  },
  feedbackContainer: {
    marginTop: "16px",
    marginBottom: "16px",
  },
  feedbackHeader: {
    fontWeight: "bold",
    marginBottom: "8px",
    fontSize: "16px",
  },
  feedbackContent: {
    padding: "16px",
    borderRadius: "4px",
    fontFamily: "sans-serif",
    whiteSpace: "pre-wrap",
    lineHeight: "1.6",
    fontSize: "14px",
    maxHeight: "400px",
    overflowY: "auto",
  },
  feedbackSuccess: {
    backgroundColor: "#e8f5e9",
    border: "2px solid #4caf50",
    color: "#2e7d32",
  },
  feedbackError: {
    backgroundColor: "#ffebee",
    border: "2px solid #f44336",
    color: "#c62828",
  },
  feedbackInfo: {
    backgroundColor: "#e3f2fd",
    border: "2px solid #2196f3",
    color: "#1565c0",
  },
  testCaseContainer: {
    marginTop: "16px",
  },
  testCase: {
    marginBottom: "8px",
    padding: "12px",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    display: "flex",
    flexDirection: "column",
  },
  testCaseHeader: {
    fontWeight: "bold",
    marginBottom: "8px",
  },
  testCaseInfo: {
    display: "flex",
    gap: "16px",
    marginTop: "8px",
  },
  testCaseInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: "8px",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "12px",
  },
  testCaseOutput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: "8px",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "12px",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "16px",
    padding: "12px",
  },
};

const SimpleCodeEditor = ({ 
  step, 
  setInputValState, 
  onValidationReady, 
  index,
  problemTitle = "",
  problemBody = "",
}) => {
  const context = useContext(ThemeContext);
  const textareaRef = useRef(null);
  const initialCode = step?.codeTemplate || "def solution():\n    # Your code here\n    pass";
  const [code, setCode] = useState(initialCode);
  const [feedback, setFeedback] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationState, setEvaluationState] = useState(null); // 'success', 'error', or null
  const [isCodeCorrect, setIsCodeCorrect] = useState(false);

  // Update code when step changes
  useEffect(() => {
    const newCodeTemplate = step?.codeTemplate || "def solution():\n    # Your code here\n    pass";
    if (newCodeTemplate !== code) {
      setCode(newCodeTemplate);
      setFeedback("");
      setEvaluationState(null);
      setIsCodeCorrect(false);
      // Update input state
      if (setInputValState) {
        setInputValState(newCodeTemplate);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, step?.codeTemplate]);

  // Expose validation method to parent component
  useEffect(() => {
    if (onValidationReady) {
      onValidationReady(validateSubmission);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onValidationReady, isCodeCorrect, feedback, code]);

  const handleCodeChange = (event) => {
    const newCode = event.target.value;
    setCode(newCode);
    // Update parent component state
    if (setInputValState) {
      setInputValState(newCode);
    }
    // Clear previous feedback when code changes
    if (feedback) {
      setFeedback("");
      setEvaluationState(null);
      setIsCodeCorrect(false);
    }
  };

  const handleKeyDown = (event) => {
    // Handle Tab key to insert 4 spaces instead of moving focus
    if (event.key === 'Tab') {
      event.preventDefault();
      
      const textarea = textareaRef.current?.querySelector('textarea') || textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = '    '; // 4 spaces for Python indentation
      
      // Insert spaces at cursor position
      const newCode = code.substring(0, start) + spaces + code.substring(end);
      setCode(newCode);
      
      // Update parent component state
      if (setInputValState) {
        setInputValState(newCode);
      }
      
      // Clear previous feedback when code changes
      if (feedback) {
        setFeedback("");
        setEvaluationState(null);
        setIsCodeCorrect(false);
      }
      
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        const newCursorPos = start + spaces.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    }
  };

  const handleEvaluate = async () => {
    if (!code || code.trim() === "") {
      setFeedback("Please write some code before evaluating.");
      setEvaluationState("error");
      setIsCodeCorrect(false);
      return false;
    }

    setIsEvaluating(true);
    setFeedback("");
    setEvaluationState(null);

    try {
      // Build problem description
      const problemDescription = `${problemTitle || ""}\n${problemBody || ""}`.trim();
      const stepDescription = `${step?.stepTitle || ""}\n${step?.stepBody || ""}`.trim();

      // Call the evaluation API
      const response = await evaluateCode(problemDescription, stepDescription, code);
      
      setFeedback(response);
      
      // Determine if code is correct based on response
      // Look for positive indicators
      const positiveIndicators = [
        "correct",
        "looks good",
        "well done",
        "excellent",
        "perfect",
        "right",
        "correctly",
        "successfully",
      ];
      const negativeIndicators = [
        "error",
        "incorrect",
        "wrong",
        "issue",
        "problem",
        "bug",
        "mistake",
        "fails",
        "doesn't work",
      ];

      const lowerResponse = response.toLowerCase();
      const hasPositive = positiveIndicators.some(indicator => 
        lowerResponse.includes(indicator)
      );
      const hasNegative = negativeIndicators.some(indicator => 
        lowerResponse.includes(indicator)
      );

      // If response clearly indicates success without errors, mark as correct
      const resultIsCorrect = hasPositive && !hasNegative;
      setIsCodeCorrect(resultIsCorrect);
      
      // Set evaluation state based on correctness
      if (resultIsCorrect) {
        setEvaluationState("success");
      } else {
        setEvaluationState("error");
      }
      
      return resultIsCorrect;
    } catch (error) {
      console.error("Error evaluating code:", error);
      setFeedback(`Error: ${error.message || "Failed to evaluate code. Please try again."}`);
      setEvaluationState("error");
      setIsCodeCorrect(false);
      return false;
    } finally {
      setIsEvaluating(false);
    }
  };

  const validateSubmission = async () => {
    // If evaluation hasn't been done yet, trigger it first
    // Note: We check if feedback is empty to determine if evaluation was done
    if (!feedback && code && code.trim() !== "") {
      try {
        const result = await handleEvaluate();
        return result;
      } catch (error) {
        console.error('Error during validation evaluation:', error);
        return false;
      }
    }
    // Return whether the code is correct based on AI evaluation
    return isCodeCorrect;
  };

  // Get parsed test cases for display
  const getParsedTestCases = () => {
    let testCases = step?.testCases;
    if (!testCases) {
      return [];
    }
    
    if (typeof testCases === 'string') {
      try {
        testCases = JSON.parse(testCases);
      } catch (error) {
        console.error('Invalid test cases JSON:', error);
        return [];
      }
    }
    
    return Array.isArray(testCases) ? testCases : [];
  };

  const displayTestCases = getParsedTestCases();

  return (
    <Box>
      <Paper className={styles.editorContainer}>
        <div className={styles.editorHeader}>
          <Typography variant="subtitle2">Python Code Editor</Typography>
          <Typography variant="caption" color="textSecondary">
            Write your solution below and click "Evaluate Code" to get feedback
          </Typography>
        </div>
        <div className={styles.editorContent}>
          <TextField
            inputRef={textareaRef}
            multiline
            fullWidth
            value={code}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            placeholder="Write your Python code here..."
            variant="outlined"
            inputProps={{
              style: styles.codeTextarea,
              "aria-label": "Code editor for Python programming",
            }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={isEvaluating ? <CircularProgress size={20} /> : <PlayArrowIcon />}
            onClick={handleEvaluate}
            disabled={isEvaluating || !code || code.trim() === ""}
            className={styles.evaluateButton}
            {...stagingProp({
              "data-selenium-target": `evaluate-code-${index}`
            })}
          >
            {isEvaluating ? "Evaluating..." : "Evaluate Code"}
          </Button>
        </div>
      </Paper>

      {/* Feedback Display */}
      {feedback && (
        <Paper 
          className={styles.feedbackContainer}
          style={{
            ...styles.feedbackContent,
            ...(evaluationState === "success" 
              ? styles.feedbackSuccess 
              : evaluationState === "error" 
              ? styles.feedbackError 
              : styles.feedbackInfo)
          }}
        >
          <Typography variant="h6" className={styles.feedbackHeader}>
            {evaluationState === "success" ? "✓ Feedback" : "Feedback"}
          </Typography>
          <div style={{ whiteSpace: "pre-wrap" }}>{feedback}</div>
        </Paper>
      )}

      {/* Test Cases Display */}
      {displayTestCases.length > 0 && (
        <Box className={styles.testCaseContainer}>
          <Typography variant="h6" style={{ marginBottom: "8px" }}>
            Test Cases (for reference)
          </Typography>
          {displayTestCases.map((testCase, idx) => (
            <Paper key={idx} className={styles.testCase}>
              <Typography variant="body2" className={styles.testCaseHeader}>
                <strong>Test {idx + 1}</strong>
                {testCase.description && `: ${testCase.description}`}
              </Typography>
              <div className={styles.testCaseInfo}>
                <Box flex={1}>
                  <Typography variant="caption" color="textSecondary">
                    Input:
                  </Typography>
                  <div className={styles.testCaseInput}>
                    {(() => {
                      const input = typeof testCase.input === 'string' 
                        ? testCase.input 
                        : (Array.isArray(testCase.input) 
                          ? testCase.input.join(', ') 
                          : String(testCase.input || ''));
                      if (!input || input.trim() === '' || input === 'N/A' || 
                          (typeof input === 'string' && input.includes('()') && !input.includes(','))) {
                        return 'N/A';
                      }
                      return input;
                    })()}
                  </div>
                </Box>
                <Box flex={1}>
                  <Typography variant="caption" color="textSecondary">
                    Expected Output:
                  </Typography>
                  <div className={styles.testCaseOutput}>
                    {testCase.expectedOutput}
                  </div>
                </Box>
              </div>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default SimpleCodeEditor;
