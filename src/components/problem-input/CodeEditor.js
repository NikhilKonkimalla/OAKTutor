import React, { useEffect, useRef, useState, useContext } from "react";
import { Box, Button, Typography, Paper, CircularProgress } from "@material-ui/core";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import { stagingProp } from "../../util/addStagingProperty";
import { ThemeContext } from "../../config/config";

// Import CodeMirror 6
import { EditorView, basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";
import { EditorState, Prec } from "@codemirror/state";
import { highlightSelectionMatches } from "@codemirror/search";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";

// Import Skulpt for Python execution
import Skulpt from "skulpt";

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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  editorContent: {
    height: "500px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  runButton: {
    marginTop: "8px",
    marginBottom: "8px",
  },
  outputContainer: {
    marginTop: "16px",
  },
  outputHeader: {
    fontWeight: "bold",
    marginBottom: "8px",
  },
  outputContent: {
    backgroundColor: "#f9f9f9",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    padding: "8px",
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    minHeight: "60px",
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
  testCasePending: {
    backgroundColor: "#f5f5f5",
    borderColor: "#9e9e9e",
  },
  testCaseInfo: {
    flex: 1,
  },
  testCaseResult: {
    marginLeft: "8px",
  },
  consoleContainer: {
    marginTop: "16px",
    marginBottom: "16px",
  },
  consoleHeader: {
    fontWeight: "bold",
    marginBottom: "8px",
    color: "#333333",
  },
  consoleContent: {
    backgroundColor: "#1e1e1e",
    border: "1px solid #333333",
    borderRadius: "4px",
    padding: "12px",
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    minHeight: "60px",
    color: "#d4d4d4",
    fontSize: "14px",
    lineHeight: "1.6",
    maxHeight: "400px",
    overflowY: "auto",
  },
  errorMessage: {
    color: "#f48771",
  },
  warningMessage: {
    color: "#dcdcaa",
  },
  infoMessage: {
    color: "#4fc1ff",
  },
};

const CodeEditor = ({ step, setInputValState, onValidationReady, index }) => {
  const context = useContext(ThemeContext);
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const [code, setCode] = useState(step?.codeTemplate || "def solution():\n    # Your code here\n    pass");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [, setTestResults] = useState([]);
  const [allTestsPassed, setAllTestsPassed] = useState(false);
  
  // Keystroke tracking state
  const lastInputLengthRef = useRef(0);
  const lastKeystrokeTimeRef = useRef(null);

  // Initialize Skulpt
  useEffect(() => {
    if (typeof Skulpt !== 'undefined') {
      // Initialize builtin files structure if not already present
      if (!Skulpt.builtinFiles) {
        Skulpt.builtinFiles = {
          "files": {}
        };
      }
      
      // Configure Skulpt with basic Python modules
      Skulpt.configure({
        output: () => {},
        read: (filename) => {
          // For builtin modules, return empty string to allow basic Python execution
          // Skulpt will handle basic operations without requiring full stdlib
          if (Skulpt.builtinFiles && Skulpt.builtinFiles["files"] && Skulpt.builtinFiles["files"][filename]) {
            return Skulpt.builtinFiles["files"][filename];
          }
          // Return empty string for missing modules - allows basic Python code to run
          // without requiring full stdlib imports
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
  
  // Reset keystroke tracking when step changes
  useEffect(() => {
    // Flush buffer for previous step when step changes
    return () => {
      if (context?.firebase && context.firebase.flushKeystrokeBuffer) {
        const problemID = context.problemID || "n/a";
        const stepID = step?.id || "n/a";
        context.firebase.flushKeystrokeBuffer(problemID, stepID);
      }
    };
  }, [step?.id, context?.firebase, context?.problemID]);

  // Initialize CodeMirror editor
  useEffect(() => {
    // Cleanup function
    const cleanup = () => {
      // Flush keystroke buffer when component unmounts
      if (context?.firebase && context.firebase.flushKeystrokeBuffer) {
        const problemID = context.problemID || "n/a";
        const stepID = step?.id || "n/a";
        context.firebase.flushKeystrokeBuffer(problemID, stepID);
      }
    };
    
    if (editorRef.current && !viewRef.current) {
      const startState = EditorState.create({
        doc: code,
        extensions: [
          basicSetup,
          python(),
          highlightSelectionMatches(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newCode = update.state.doc.toString();
              setCode(newCode);
              
              // Track keystroke for code editor
              const currentLength = newCode.length;
              const previousLength = lastInputLengthRef.current;
              const now = Date.now();
              const timeSinceLastKeystroke = lastKeystrokeTimeRef.current ? now - lastKeystrokeTimeRef.current : 0;
              
              // Detect paste event: large text insertion (>20 characters at once for code)
              const lengthChange = currentLength - previousLength;
              const isPasteEvent = lengthChange > 20;
              
              // Log keystroke if Firebase is available
              if (context?.firebase && context.firebase.logKeystroke) {
                const problemID = context.problemID || "n/a";
                const stepID = step?.id || "n/a";
                
                context.firebase.logKeystroke(
                  problemID,
                  stepID,
                  currentLength,
                  previousLength,
                  timeSinceLastKeystroke,
                  isPasteEvent,
                  false // Don't flush unless buffer is full
                );
              }
              
              lastInputLengthRef.current = currentLength;
              lastKeystrokeTimeRef.current = now;
              
              if (setInputValState) {
                setInputValState(newCode);
              }
            }
          }),
          Prec.high(keymap.of([indentWithTab])),
          EditorView.theme({
            "&": {
              height: "100%",
              fontSize: "16px",
              backgroundColor: "#ffffff",
            },
            ".cm-content": {
              padding: "12px",
              backgroundColor: "#ffffff",
              color: "#333333",
            },
            ".cm-focused": {
              outline: "none",
            },
            ".cm-editor": {
              backgroundColor: "#ffffff",
            },
            ".cm-scroller": {
              backgroundColor: "#ffffff",
            },
            ".cm-line": {
              color: "#333333",
            },
            ".cm-keyword": {
              color: "#0000ff",
              fontWeight: "bold",
            },
            ".cm-string": {
              color: "#008000",
            },
            ".cm-comment": {
              color: "#808080",
              fontStyle: "italic",
            },
            ".cm-number": {
              color: "#ff6600",
            },
            ".cm-variable": {
              color: "#333333",
            },
            ".cm-def": {
              color: "#0000ff",
              fontWeight: "bold",
            },
            ".cm-builtin": {
              color: "#800080",
            },
            ".cm-operator": {
              color: "#ff6600",
            },
            ".cm-selectionBackground": {
              backgroundColor: "#3399ff !important",
            },
            ".cm-focused .cm-selectionBackground": {
              backgroundColor: "#3399ff !important",
            },
            ".cm-selectionMatch": {
              backgroundColor: "#3399ff !important",
            },
            ".cm-selectionLayer .cm-selectionBackground": {
              backgroundColor: "#3399ff !important",
            },
            ".cm-editor.cm-focused .cm-selectionBackground": {
              backgroundColor: "#3399ff !important",
            },
            ".cm-editor .cm-selectionBackground": {
              backgroundColor: "#3399ff !important",
            },
            ".cm-editor .cm-selectionLayer": {
              backgroundColor: "#3399ff !important",
            },
            ".cm-editor .cm-selection": {
              backgroundColor: "#3399ff !important",
            },
            ".cm-selection": {
              backgroundColor: "#3399ff !important",
            },
            ".cm-focused .cm-selection": {
              backgroundColor: "#3399ff !important",
            },
            ".cm-selectionLayer": {
              backgroundColor: "#3399ff !important",
            },
            ".cm-focused .cm-selectionLayer": {
              backgroundColor: "#3399ff !important",
            },
          }),
        ],
      });

      const view = new EditorView({
        state: startState,
        parent: editorRef.current,
      });

      viewRef.current = view;
    }

      return () => {
        cleanup();
        if (viewRef.current) {
          viewRef.current.destroy();
          viewRef.current = null;
        }
      };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCode = async () => {
    if (!code.trim()) {
      setOutput("No code to run.");
      return;
    }

    setIsRunning(true);
    setOutput("");
    setTestResults([]);

    try {
      // Configure Skulpt with proper output capture
      Skulpt.configure({
        output: (text) => {
          console.log('Skulpt output captured:', text);
          setOutput(prev => prev + text);
        },
        read: (filename) => {
          // Return builtin file if available, otherwise return empty string
          // This allows basic Python code to run without requiring full stdlib
          if (Skulpt.builtinFiles && Skulpt.builtinFiles["files"] && Skulpt.builtinFiles["files"][filename]) {
            return Skulpt.builtinFiles["files"][filename];
          }
          // Return empty string for missing modules - allows basic operations
          return "";
        },
        execLimit: 10000,
        __future__: Skulpt.python3,
      });

      // Execute the code
      try {
        // Check if code contains function definitions that need to be called
        let codeToExecute = code;
        const functionMatches = code.match(/def\s+(\w+)\s*\(/g);
        if (functionMatches) {
          // Extract function names and add calls to them
          const functionNames = functionMatches.map(match => {
            const nameMatch = match.match(/def\s+(\w+)\s*\(/);
            return nameMatch ? nameMatch[1] : null;
          }).filter(name => name !== null);
          
          // Add function calls to the code
          const functionCalls = functionNames.map(name => `${name}()`).join('\n');
          codeToExecute = code + '\n' + functionCalls;
        }
        
        await Skulpt.importMainWithBody("<stdin>", false, codeToExecute, true);
      } catch (error) {
        // If there's an import error, try executing without imports
        const errorMessage = error.toString();
        const errorDetails = error.args && error.args.v && error.args.v.length > 0 
          ? error.args.v[0].v 
          : errorMessage;
        
        if (errorMessage.includes('ImportError') || errorDetails.includes('No module named')) {
          // Remove import statements and try again
          const cleanCode = code
            .split('\n')
            .filter(line => !line.trim().startsWith('import ') && !line.trim().startsWith('from '))
            .join('\n');
          
          if (cleanCode.trim() && cleanCode.trim() !== code.trim()) {
            setOutput(prev => prev + "Note: Import statements are not supported. Running code without imports...\n");
            try {
              await Skulpt.importMainWithBody("<stdin>", false, cleanCode, true);
            } catch (cleanError) {
              // If still fails, throw the original error
              throw error;
            }
          } else {
            // If code has imports that can't be removed, show helpful error
            throw new Error(`ImportError: Standard library modules like 'sys' are not available. Please write code without imports.`);
          }
        } else {
          throw error;
        }
      }
      
      // Check if we have any output, if not show success message
      setTimeout(() => {
        setOutput(prev => {
          if (!prev || prev.trim() === '') {
            return "Code executed successfully!";
          }
          return prev;
        });
      }, 100);
      
      // Run test cases if they exist
      if (step?.testCases && step.testCases.length > 0) {
        await runTestCases();
      }
      
      setIsRunning(false);
    } catch (error) {
      setIsRunning(false);
      
      // Comprehensive error output
      let errorOutput = "=== ERROR ===\n";
      errorOutput += `${error.toString()}\n`;
      
      // Add error details if available
      if (error.args && error.args.v && error.args.v.length > 0) {
        errorOutput += `\nError details: ${error.args.v[0].v}\n`;
      }
      
      // Add traceback if available
      if (error.traceback && error.traceback.length > 0) {
        errorOutput += "\nTraceback:\n";
        error.traceback.forEach((tb) => {
          if (tb.filename && tb.lineno) {
            errorOutput += `  File "${tb.filename}", line ${tb.lineno}\n`;
          }
        });
      }
      
      // Add stack trace if available
      if (error.stack) {
        errorOutput += "\nStack trace:\n";
        errorOutput += error.stack + "\n";
      }
      
      errorOutput += "=============\n";
      setOutput(errorOutput);
    }
  };

  const runTestCases = async () => {
    const testResults = [];
    
    // Parse test cases if they're stored as a string
    let testCases = step.testCases;
    console.log('Raw test cases:', testCases, 'Type:', typeof testCases);
    
    if (typeof testCases === 'string') {
      try {
        testCases = JSON.parse(testCases);
        console.log('Parsed test cases:', testCases);
      } catch (error) {
        console.error('Invalid test cases JSON:', error);
        setTestResults([]);
        setAllTestsPassed(false);
        return false;
      }
    }
    
    if (!Array.isArray(testCases) || testCases.length === 0) {
      console.log('No valid test cases found');
      setTestResults([]);
      setAllTestsPassed(false);
      return false;
    }
    
    console.log('Running', testCases.length, 'test cases');
    console.log('Test cases:', testCases);
    
      for (const testCase of testCases) {
      console.log('Running test case:', testCase);
      try {
        // Clear output for each test
        let testOutput = "";
        
        Skulpt.configure({
          output: (text) => {
            testOutput += text;
          },
          read: (filename) => {
            // Return builtin file if available, otherwise return empty string
            if (Skulpt.builtinFiles && Skulpt.builtinFiles["files"] && Skulpt.builtinFiles["files"][filename]) {
              return Skulpt.builtinFiles["files"][filename];
            }
            // Return empty string for missing modules
            return "";
          },
          execLimit: 10000,
          __future__: Skulpt.python3,
        });

        // Execute the test case
        let testCode;
        // Ensure input is a string before calling trim
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
            console.log('Import error in test case, trying direct execution...');
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
        // Comprehensive error output for test cases
        let errorOutput = `Error: ${error.toString()}`;
        
        // Add error details if available
        if (error.args && error.args.v && error.args.v.length > 0) {
          errorOutput += `\nDetails: ${error.args.v[0].v}`;
        }
        
        // Add traceback if available
        if (error.traceback && error.traceback.length > 0) {
          errorOutput += "\nTraceback:";
          error.traceback.forEach((tb) => {
            if (tb.filename && tb.lineno) {
              errorOutput += `\n  File "${tb.filename}", line ${tb.lineno}`;
            }
          });
        }
        
        // Add stack trace if available (condensed for test results)
        if (error.stack) {
          const stackLines = error.stack.split('\n').slice(0, 3); // First 3 lines only
          errorOutput += "\n" + stackLines.join('\n');
        }
        
        testResults.push({
          ...testCase,
          actualOutput: errorOutput,
          passed: false,
        });
      }
    }
    
    const allTestsPassedResult = testResults.length > 0 && testResults.every(result => result.passed);
    setTestResults(testResults);
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
    console.log('CodeEditor - step prop:', step);
    console.log('CodeEditor - step.testCases:', step?.testCases);
    
    let testCases = step?.testCases;
    if (!testCases) {
      console.log('No test cases found in step');
      return [];
    }
    
    if (typeof testCases === 'string') {
      try {
        testCases = JSON.parse(testCases);
        console.log('Parsed test cases from string:', testCases);
      } catch (error) {
        console.error('Invalid test cases JSON:', error);
        return [];
      }
    }
    
    console.log('Final test cases:', testCases);
    return Array.isArray(testCases) ? testCases : [];
  };

  const displayTestCases = getParsedTestCases();
  
  // Debug: Always show something if we have test cases
  console.log('displayTestCases.length:', displayTestCases.length);
  console.log('Will show test cases section:', displayTestCases.length > 0);
  
  // Fallback: If no test cases found, show a simple test case for debugging
  const fallbackTestCases = displayTestCases.length === 0 ? [
    { input: "solution()", expectedOutput: "Hello World", description: "Test Case 1" }
  ] : displayTestCases;

  return (
    <Box>
      <style>
        {`
          .cm-editor .cm-selectionBackground {
            background-color: #3399ff !important;
          }
          .cm-editor .cm-focused .cm-selectionBackground {
            background-color: #3399ff !important;
          }
          .cm-editor .cm-selection {
            background-color: #3399ff !important;
          }
          .cm-editor .cm-focused .cm-selection {
            background-color: #3399ff !important;
          }
          .cm-editor .cm-selectionLayer {
            background-color: #3399ff !important;
          }
          .cm-editor .cm-focused .cm-selectionLayer {
            background-color: #3399ff !important;
          }
          .cm-editor .cm-selectionMatch {
            background-color: #3399ff !important;
          }
          .cm-editor .cm-focused .cm-selectionMatch {
            background-color: #3399ff !important;
          }
        `}
      </style>
      <Paper className={styles.editorContainer}>
        <div className={styles.editorHeader}>
          <Typography variant="subtitle2">Python Code Editor</Typography>
          <Typography variant="caption" color="textSecondary">
            Write your solution below
          </Typography>
        </div>
        <div className={styles.editorContent}>
          <div ref={editorRef} style={{ height: "100%", width: "100%" }} />
        </div>
      </Paper>

      <Button
        variant="contained"
        color="primary"
        startIcon={isRunning ? <CircularProgress size={20} /> : <PlayArrowIcon />}
        onClick={runCode}
        disabled={isRunning}
        className={styles.runButton}
        tabIndex={-1}
        {...stagingProp({
          "data-selenium-target": `run-code-${index}`
        })}
      >
        {isRunning ? "Running..." : "Run Code"}
      </Button>

      {(output || isRunning) && (
        <Box className={styles.consoleContainer}>
          <Typography className={styles.consoleHeader}>
            Console Output:
          </Typography>
          <div className={styles.consoleContent}>
            {output || (isRunning ? "Running..." : "No output")}
          </div>
        </Box>
      )}

      {fallbackTestCases.length > 0 && (
        <Box className={styles.testCaseContainer} style={{ marginTop: "16px" }}>
          <Typography className={styles.outputHeader}>
            Test Cases
          </Typography>
          {fallbackTestCases.map((testCase, index) => (
            <Paper
              key={index}
              className={styles.testCase}
              style={{ marginBottom: "8px", padding: "12px" }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box flex={1}>
                  <Typography variant="body2" style={{ marginBottom: "8px" }}>
                    <strong>Test {index + 1}</strong>
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
                          // Ensure input is a string before calling string methods
                          const input = typeof testCase.input === 'string' ? testCase.input : 
                                       (Array.isArray(testCase.input) ? testCase.input.join(', ') : 
                                       String(testCase.input || ''));
                          // If input is empty, N/A, or just a function call with no parameters, show N/A
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

export default CodeEditor;