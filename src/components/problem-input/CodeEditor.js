import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Typography, Paper, CircularProgress } from "@material-ui/core";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import CheckIcon from "@material-ui/icons/Check";
import CloseIcon from "@material-ui/icons/Close";
import { stagingProp } from "../../util/addStagingProperty";

// Import CodeMirror 6
import { EditorView, basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { highlightSelectionMatches } from "@codemirror/search";

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
  },
  testCaseFailed: {
    backgroundColor: "#ffebee",
    borderColor: "#f44336",
  },
  testCaseInfo: {
    flex: 1,
  },
  testCaseResult: {
    marginLeft: "8px",
  },
};

const CodeEditor = ({ step, setInputValState, onValidationReady, index }) => {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const [code, setCode] = useState(step?.codeTemplate || "def solution():\n    # Your code here\n    pass");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [allTestsPassed, setAllTestsPassed] = useState(false);

  // Initialize Skulpt
  useEffect(() => {
    if (typeof Skulpt !== 'undefined') {
      // Configure Skulpt with basic Python modules
      Skulpt.configure({
        output: () => {},
        read: (filename) => {
          if (Skulpt.builtinFiles === undefined || Skulpt.builtinFiles["files"][filename] === undefined) {
            throw new Error("File not found: '" + filename + "'");
          }
          return Skulpt.builtinFiles["files"][filename];
        },
        execLimit: 10000,
      });
      
      // Initialize builtin files
      Skulpt.builtinFiles = {
        "files": {
          "builtin": {
            "contents": ""
          }
        }
      };
    }
    
    // Expose validation method to parent component
    if (onValidationReady) {
      onValidationReady(validateSubmission);
    }
  }, [onValidationReady]);

  // Initialize CodeMirror editor
  useEffect(() => {
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
              if (setInputValState) {
                setInputValState(newCode);
              }
            }
          }),
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
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
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
      // Clear previous output
      setOutput("");
      
      // Configure Skulpt
      Skulpt.configure({
        output: (text) => {
          setOutput(prev => prev + text);
        },
        read: (filename) => {
          if (Skulpt.builtinFiles === undefined || Skulpt.builtinFiles["files"][filename] === undefined) {
            throw new Error("File not found: '" + filename + "'");
          }
          return Skulpt.builtinFiles["files"][filename];
        },
        execLimit: 10000,
      });

      // Execute the code
      try {
        await Skulpt.importMainWithBody("<stdin>", false, code, true);
      } catch (error) {
        // If there's an import error, try executing without imports
        if (error.message && error.message.includes('ImportError')) {
          console.log('Import error detected, trying direct execution...');
          // Try to execute the code directly without import context
          const cleanCode = code.replace(/^import\s+.*$/gm, '').replace(/^from\s+.*$/gm, '');
          if (cleanCode.trim()) {
            await Skulpt.importMainWithBody("<stdin>", false, cleanCode, true);
          }
        } else {
          throw error;
        }
      }
      
      // Run test cases if they exist
      if (step?.testCases && step.testCases.length > 0) {
        await runTestCases();
      }
      
      setIsRunning(false);
    } catch (error) {
      setIsRunning(false);
      setOutput(`Error: ${error.message || error.toString()}`);
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
        return;
      }
    }
    
    if (!Array.isArray(testCases) || testCases.length === 0) {
      console.log('No valid test cases found');
      return;
    }
    
    console.log('Running', testCases.length, 'test cases');
    
    for (const testCase of testCases) {
      try {
        // Clear output for each test
        let testOutput = "";
        Skulpt.configure({
          output: (text) => {
            testOutput += text;
          },
          read: (filename) => {
            if (Skulpt.builtinFiles === undefined || Skulpt.builtinFiles["files"][filename] === undefined) {
              throw new Error("File not found: '" + filename + "'");
            }
            return Skulpt.builtinFiles["files"][filename];
          },
          execLimit: 10000,
        });

        // Execute the test case
        let testCode;
        if (testCase.input && testCase.input.trim()) {
          testCode = `${code}\n${testCase.input}`;
        } else {
          // For empty input, just run the code directly
          testCode = code;
        }
        
        // Clear any previous output
        testOutput = "";
        
        // Configure Skulpt for this specific test
        Skulpt.configure({
          output: (text) => {
            testOutput += text;
          },
          read: (filename) => {
            if (Skulpt.builtinFiles === undefined || Skulpt.builtinFiles["files"][filename] === undefined) {
              throw new Error("File not found: '" + filename + "'");
            }
            return Skulpt.builtinFiles["files"][filename];
          },
          execLimit: 10000,
        });
        
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
        testResults.push({
          ...testCase,
          actualOutput: `Error: ${error.message || error.toString()}`,
          passed: false,
        });
      }
    }
    
    const allTestsPassed = testResults.length > 0 && testResults.every(result => result.passed);
    setTestResults(testResults);
    setAllTestsPassed(allTestsPassed);
  };

  const validateSubmission = () => {
    return allTestsPassed;
  };

  const compareOutput = (actual, expected) => {
    return actual === expected;
  };

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
        {...stagingProp({
          "data-selenium-target": `run-code-${index}`
        })}
      >
        {isRunning ? "Running..." : "Run Code"}
      </Button>

      {(output || testResults.length > 0) && (
        <div className={styles.outputContainer}>
          {output && (
            <Box>
              <Typography className={styles.outputHeader}>Output:</Typography>
              <div className={styles.outputContent}>
                {output || "No output"}
              </div>
            </Box>
          )}

          {testResults.length > 0 && (
            <Box className={styles.testCaseContainer}>
              <Typography className={styles.outputHeader}>Test Results:</Typography>
              {testResults.map((result, index) => (
                <Paper
                  key={index}
                  className={`${styles.testCase} ${
                    result.passed ? styles.testCasePassed : styles.testCaseFailed
                  }`}
                >
                  <div className={styles.testCaseInfo}>
                    <Typography variant="body2">
                      <strong>Test {index + 1}:</strong> {result.description || "Test case"}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Expected: "{result.expectedOutput}" | Got: "{result.actualOutput}"
                    </Typography>
                  </div>
                  <div className={styles.testCaseResult}>
                    {result.passed ? (
                      <CheckIcon color="primary" />
                    ) : (
                      <CloseIcon color="error" />
                    )}
                  </div>
                </Paper>
              ))}
            </Box>
          )}
        </div>
      )}
    </Box>
  );
};

export default CodeEditor;