import React, { useEffect, useRef, useState, useContext } from "react";
import { Box, Typography, Paper } from "@material-ui/core";
import { ThemeContext } from "../../config/config";

// Import Skulpt for Python execution (minimal usage for validation only)
import Skulpt from "skulpt";

const styles = {
  tutorContainer: {
    border: "2px solid #d0d0d0",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    marginBottom: "16px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
  },
  tutorHeader: {
    backgroundColor: "#f8f9fa",
    padding: "12px",
    borderBottom: "2px solid #d0d0d0",
  },
  tutorIframe: {
    width: "100%",
    minHeight: "1000px",
    height: "calc(100vh - 300px)",
    border: "none",
  },
  testCaseContainer: {
    marginTop: "16px",
  },
  testCase: {
    marginBottom: "8px",
    padding: "8px",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  testCasePassed: {
    backgroundColor: "#e8f5e8",
    borderColor: "#4caf50",
    borderWidth: "2px",
  },
  testCaseFailed: {
    backgroundColor: "#ffebee",
    borderColor: "#f44336",
    borderWidth: "2px",
  },
};

const PythonTutorEditor = ({ step, setInputValState, onValidationReady, index }) => {
  const context = useContext(ThemeContext);
  const iframeRef = useRef(null);
  const [code, setCode] = useState(step?.codeTemplate || "def solution():\n    # Your code here\n    pass");
  const [pythonTutorUrl, setPythonTutorUrl] = useState("");
  const [allTestsPassed, setAllTestsPassed] = useState(false);
  
  const updateTimeoutRef = useRef(null);

  // Initialize Skulpt for validation only
  useEffect(() => {
    if (typeof Skulpt !== 'undefined') {
      // Initialize builtin files structure if not already present
      if (!Skulpt.builtinFiles) {
        Skulpt.builtinFiles = {
          "files": {}
        };
      }
      
      // Configure Skulpt with basic Python modules (for validation only)
      Skulpt.configure({
        output: () => {},
        read: (filename) => {
          if (Skulpt.builtinFiles && Skulpt.builtinFiles["files"] && Skulpt.builtinFiles["files"][filename]) {
            return Skulpt.builtinFiles["files"][filename];
          }
          return "";
        },
        execLimit: 10000,
        __future__: Skulpt.python3,
      });
    }
    
    // Expose validation method to parent component
    if (onValidationReady) {
      onValidationReady(validateSubmission);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onValidationReady, step]);
  
  // Update code when step changes
  useEffect(() => {
    const newCodeTemplate = step?.codeTemplate || "def solution():\n    # Your code here\n    pass";
    if (newCodeTemplate !== code) {
      setCode(newCodeTemplate);
      // Update input state
      if (setInputValState) {
        setInputValState(newCodeTemplate);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, step?.codeTemplate]);

  // Initialize Python Tutor URL immediately with initial code
  useEffect(() => {
    const encodedCode = encodeURIComponent(code);
    const url = `https://pythontutor.com/render.html#code=${encodedCode}&py=3&cumulative=false&curInstr=0&heapPrimitives=nevernest&mode=display&origin=opt-frontend.js&rawInputLstJSON=%5B%5D&textReferences=false`;
    setPythonTutorUrl(url);
  }, []); // Only run once on mount

  // Update Python Tutor URL when code changes (with debouncing)
  useEffect(() => {
    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounce the URL update to avoid too many iframe reloads
    updateTimeoutRef.current = setTimeout(() => {
      const encodedCode = encodeURIComponent(code);
      const url = `https://pythontutor.com/render.html#code=${encodedCode}&py=3&cumulative=false&curInstr=0&heapPrimitives=nevernest&mode=display&origin=opt-frontend.js&rawInputLstJSON=%5B%5D&textReferences=false`;
      setPythonTutorUrl(url);
    }, 500); // 500ms debounce

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [code]);


  // Run test cases using minimal Skulpt execution (for validation only)
  const runTestCases = async () => {
    const testResults = [];
    
    // Parse test cases if they're stored as a string
    let testCases = step.testCases;
    
    if (typeof testCases === 'string') {
      try {
        testCases = JSON.parse(testCases);
      } catch (error) {
        console.error('Invalid test cases JSON:', error);
        setAllTestsPassed(false);
        return false;
      }
    }
    
    if (!Array.isArray(testCases) || testCases.length === 0) {
      console.log('No valid test cases found');
      setAllTestsPassed(false);
      return false;
    }
    
    for (const testCase of testCases) {
      try {
        // Clear output for each test
        let testOutput = "";
        
        Skulpt.configure({
          output: (text) => {
            testOutput += text;
          },
          read: (filename) => {
            if (Skulpt.builtinFiles && Skulpt.builtinFiles["files"] && Skulpt.builtinFiles["files"][filename]) {
              return Skulpt.builtinFiles["files"][filename];
            }
            return "";
          },
          execLimit: 10000,
          __future__: Skulpt.python3,
        });

        // Execute the test case
        let testCode;
        const inputStr = typeof testCase.input === 'string' ? testCase.input : 
                        (Array.isArray(testCase.input) ? testCase.input.join(', ') : 
                        String(testCase.input || ''));
        if (inputStr && inputStr.trim() && inputStr !== 'N/A') {
          testCode = `${code}\n${inputStr}`;
        } else {
          // For empty input or N/A, just run the code directly
          testCode = code;
        }
        
        try {
          await Skulpt.importMainWithBody("<test>", false, testCode, true);
        } catch (error) {
          // If there's an import error, try executing without imports
          if (error.message && error.message.includes('ImportError')) {
            const cleanTestCode = testCode.replace(/^import\s+.*$/gm, '').replace(/^from\s+.*$/gm, '');
            if (cleanTestCode.trim()) {
              await Skulpt.importMainWithBody("<test>", false, cleanTestCode, true);
            }
          } else {
            throw error;
          }
        }
        
        // Compare output
        const passed = compareOutput(testOutput.trim(), testCase.expectedOutput);
        
        testResults.push({
          ...testCase,
          actualOutput: testOutput.trim(),
          passed,
        });
      } catch (error) {
        // Error output for test cases
        let errorOutput = `Error: ${error.toString()}`;
        
        if (error.args && error.args.v && error.args.v.length > 0) {
          errorOutput += `\nDetails: ${error.args.v[0].v}`;
        }
        
        if (error.traceback && error.traceback.length > 0) {
          errorOutput += "\nTraceback:";
          error.traceback.forEach((tb) => {
            if (tb.filename && tb.lineno) {
              errorOutput += `\n  File "${tb.filename}", line ${tb.lineno}`;
            }
          });
        }
        
        testResults.push({
          ...testCase,
          actualOutput: errorOutput,
          passed: false,
        });
      }
    }
    
    const allTestsPassedResult = testResults.length > 0 && testResults.every(result => result.passed);
    setAllTestsPassed(allTestsPassedResult);
    return allTestsPassedResult;
  };

  // Function to run test cases and validate submission
  const runTestsAndValidate = async () => {
    if (!step?.testCases || (Array.isArray(step.testCases) && step.testCases.length === 0)) {
      // If no test cases, consider it valid (for backwards compatibility)
      return true;
    }
    
    // Run test cases and return the result directly
    const result = await runTestCases();
    return result;
  };

  const validateSubmission = async () => {
    // For coding problems, we need to run test cases first
    if (step?.problemType === 'Coding') {
      return await runTestsAndValidate();
    }
    return allTestsPassed;
  };

  const compareOutput = (actual, expected) => {
    return actual === expected;
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
    <Box style={{ width: "100%" }}>
      {pythonTutorUrl && (
        <Paper className={styles.tutorContainer} style={{ width: "100%" }}>
          <div className={styles.tutorHeader}>
            <Typography variant="subtitle2">Python Code Editor & Visualization</Typography>
            <Typography variant="caption" color="textSecondary">
              Write and edit your code below, then step through execution to see how it works
            </Typography>
          </div>
          <iframe
            ref={iframeRef}
            src={pythonTutorUrl}
            style={{
              width: "100%",
              minHeight: "1000px",
              height: "calc(100vh - 300px)",
              border: "none",
              display: "block",
            }}
            title="Python Tutor Editor and Visualization"
            sandbox="allow-scripts allow-same-origin"
          />
        </Paper>
      )}

      {displayTestCases.length > 0 && (
        <Box className={styles.testCaseContainer} style={{ marginTop: "16px" }}>
          <Typography variant="h6" style={{ marginBottom: "8px" }}>
            Test Cases
          </Typography>
          {displayTestCases.map((testCase, idx) => (
            <Paper
              key={idx}
              className={styles.testCase}
              style={{ marginBottom: "8px", padding: "12px" }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                <Box flex={1}>
                  <Typography variant="body2" style={{ marginBottom: "8px" }}>
                    <strong>Test {idx + 1}</strong>
                  </Typography>
                  <Box display="flex" gap={2}>
                    <Box flex={1}>
                      <Typography variant="caption" color="textSecondary">
                        Input:
                      </Typography>
                      <div style={{ 
                        backgroundColor: "#f5f5f5", 
                        padding: "8px", 
                        borderRadius: "4px",
                        fontFamily: "monospace",
                        marginTop: "4px",
                        color: "#000000"
                      }}>
                        {(() => {
                          const input = typeof testCase.input === 'string' ? testCase.input : 
                                       (Array.isArray(testCase.input) ? testCase.input.join(', ') : 
                                       String(testCase.input || ''));
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
                      <div style={{ 
                        backgroundColor: "#f5f5f5", 
                        padding: "8px", 
                        borderRadius: "4px",
                        fontFamily: "monospace",
                        marginTop: "4px",
                        color: "#000000"
                      }}>
                        {testCase.expectedOutput}
                      </div>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PythonTutorEditor;

