import React from "react";
import { Editor } from "@monaco-editor/react";
import { Box, Button, Typography, Paper, CircularProgress } from "@material-ui/core";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import CheckIcon from "@material-ui/icons/Check";
import CloseIcon from "@material-ui/icons/Close";
import { stagingProp } from "../../util/addStagingProperty";

// Import Skulpt for Python execution
import Skulpt from "skulpt";

const styles = {
  editorContainer: {
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    overflow: "hidden",
    marginBottom: "16px",
    display: "flex",
    flexDirection: "column",
  },
  editorHeader: {
    backgroundColor: "#f5f5f5",
    padding: "8px",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  editorContent: {
    height: "400px",
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

class CodeEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      code: this.props.step?.codeTemplate || "def solution():\n    # Your code here\n    pass",
      output: "",
      isRunning: false,
      testResults: [],
      editorMounted: false,
      allTestsPassed: false,
    };
    
    this.editorRef = React.createRef();
    this.handleEditorDidMount = this.handleEditorDidMount.bind(this);
    this.handleCodeChange = this.handleCodeChange.bind(this);
    this.runCode = this.runCode.bind(this);
    this.validateSubmission = this.validateSubmission.bind(this);
  }

  handleEditorDidMount(editor, monaco) {
    this.editorRef.current = editor;
    this.setState({ editorMounted: true });
    
    // Configure Python language features
    monaco.languages.register({ id: "python" });
    monaco.languages.setMonarchTokensProvider("python", {
      tokenizer: {
        root: [
          [/#.*$/, "comment"],
          [/"""[\s\S]*?"""/, "comment.doc"],
          [/'''[\s\S]*?'''/, "comment.doc"],
          [/[a-zA-Z_]\w*/, "identifier"],
          [/\d+\.\d+/, "number.float"],
          [/\d+/, "number"],
          [/[""']/, "string", "@string"],
          [/[+\-*/%=<>!&|^~]/, "operator"],
          [/[{}[\]();,.:]/, "delimiter"],
        ],
        string: [
          [/[^\\"'$]/, "string"],
          [/\\["\\/bfnrt]/, "string.escape"],
          [/\\./, "string.escape.invalid"],
          [/["']/, "string", "@pop"],
        ],
      },
    });
  }

  handleCodeChange(value) {
    this.setState({ code: value || "" });
    // Update parent component with the code
    if (this.props.setInputValState) {
      this.props.setInputValState(value || "");
    }
  }

  async runCode() {
    if (!this.state.code.trim()) {
      this.setState({ output: "No code to run." });
      return;
    }

    this.setState({ isRunning: true, output: "", testResults: [] });

    try {
      // Configure Skulpt
      Skulpt.configure({
        output: (text) => {
          this.setState(prevState => ({
            output: prevState.output + text
          }));
        },
        read: (filename) => {
          if (Skulpt.builtinFiles === undefined || Skulpt.builtinFiles["files"][filename] === undefined) {
            throw new Error("File not found: '" + filename + "'");
          }
          return Skulpt.builtinFiles["files"][filename];
        },
        execLimit: 10000, // Limit execution to prevent infinite loops
      });

      // Execute the code
      await Skulpt.importMainWithBody("<stdin>", false, this.state.code, true);
      
      // Run test cases if they exist
      if (this.props.step?.testCases && this.props.step.testCases.length > 0) {
        await this.runTestCases();
      }
      
      this.setState({ isRunning: false });
    } catch (error) {
      this.setState({
        isRunning: false,
        output: `Error: ${error.message || error.toString()}`
      });
    }
  }

  async runTestCases() {
    const testResults = [];
    
    for (const testCase of this.props.step.testCases) {
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
          testCode = `${this.state.code}\n${testCase.input}`;
        } else {
          testCode = this.state.code;
        }
        await Skulpt.importMainWithBody("<test>", false, testCode, true);
        
        // Compare output
        const passed = this.compareOutput(testOutput.trim(), testCase.expectedOutput);
        
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
    this.setState({ testResults, allTestsPassed });
  }

  validateSubmission() {
    // This method is called by the parent component to check if the submission is valid
    return this.state.allTestsPassed;
  }

  compareOutput(actual, expected) {
    // Simple string comparison for now
    // Can be enhanced for more sophisticated matching
    return actual === expected;
  }

  componentDidMount() {
    // Initialize Skulpt with proper configuration
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
    if (this.props.onValidationReady) {
      this.props.onValidationReady(this.validateSubmission);
    }
  }

  render() {
    const classes = styles;
    const { code, output, isRunning, testResults } = this.state;

    return (
      <Box>
        <Paper className={classes.editorContainer}>
          <div className={classes.editorHeader}>
            <Typography variant="subtitle2">Python Code Editor</Typography>
            <Typography variant="caption" color="textSecondary">
              Write your solution below
            </Typography>
          </div>
          <div className={classes.editorContent}>
            <Editor
              height="400px"
              defaultLanguage="python"
              value={code}
              onChange={this.handleCodeChange}
              onMount={this.handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: "on",
                roundedSelection: false,
                scrollbar: {
                  vertical: "auto",
                  horizontal: "auto",
                },
                automaticLayout: true,
                theme: "vs-light",
              }}
            />
          </div>
        </Paper>

        <Button
          variant="contained"
          color="primary"
          startIcon={isRunning ? <CircularProgress size={20} /> : <PlayArrowIcon />}
          onClick={this.runCode}
          disabled={isRunning}
          className={classes.runButton}
          {...stagingProp({
            "data-selenium-target": `run-code-${this.props.index}`
          })}
        >
          {isRunning ? "Running..." : "Run Code"}
        </Button>

        {(output || testResults.length > 0) && (
          <div className={classes.outputContainer}>
            {output && (
              <Box>
                <Typography className={classes.outputHeader}>Output:</Typography>
                <div className={classes.outputContent}>
                  {output || "No output"}
                </div>
              </Box>
            )}

            {testResults.length > 0 && (
              <Box className={classes.testCaseContainer}>
                <Typography className={classes.outputHeader}>Test Results:</Typography>
                {testResults.map((result, index) => (
                  <Paper
                    key={index}
                    className={`${classes.testCase} ${
                      result.passed ? classes.testCasePassed : classes.testCaseFailed
                    }`}
                  >
                    <div className={classes.testCaseInfo}>
                      <Typography variant="body2">
                        <strong>Test {index + 1}:</strong> {result.description || "Test case"}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Expected: "{result.expectedOutput}" | Got: "{result.actualOutput}"
                      </Typography>
                    </div>
                    <div className={classes.testCaseResult}>
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
  }
}

export default CodeEditor;
