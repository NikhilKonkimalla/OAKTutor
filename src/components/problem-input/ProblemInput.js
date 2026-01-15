import React, { createRef } from "react";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import MultipleChoice from "./MultipleChoice";
import GridInput from "./GridInput";
import MatrixInput from "./MatrixInput";
import SimpleCodeEditor from "./SimpleCodeEditor";
import { renderText } from "../../platform-logic/renderText";
import clsx from "clsx";
import "mathlive";
import './ProblemInput.css'
import { shuffleArray } from "../../util/shuffleArray";
import { EQUATION_EDITOR_AUTO_COMMANDS, EQUATION_EDITOR_AUTO_OPERATORS, ThemeContext } from "../../config/config";
import { stagingProp } from "../../util/addStagingProperty";
import { parseMatrixTex } from "../../util/parseMatrixTex";

class ProblemInput extends React.Component {
    static contextType = ThemeContext;

    constructor(props) {
        super(props);

        this.equationRef = createRef()

        this.mathFieldRef = React.createRef();

        this.onEquationChange = this.onEquationChange.bind(this)
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handlePaste = this.handlePaste.bind(this);
        
        this.state = {
            value: "",
            isMathFieldFocused: false,
        };
        
        // Keystroke tracking state
        this.lastInputLength = 0;
        this.lastKeystrokeTime = null;
    }

    componentDidMount() {
        document.addEventListener('click', this.handleClickOutside);

        console.debug('problem', this.props.step, 'seed', this.props.seed)
        if (this.isMatrixInput()) {
            console.log('automatically determined matrix input to be the correct problem type')
        }

        const mqDisplayArea = this.equationRef?.current?.querySelector(".mq-editable-field > .mq-root-block")
        if (mqDisplayArea != null) {
            mqDisplayArea.ariaHidden = true
        }

        const textareaEl = this.equationRef?.current?.querySelector(".mq-textarea > textarea")
        if (textareaEl != null) {
            textareaEl.ariaLabel = `Answer question number ${this.props.index} here`
        }
    }

    componentDidUpdate(prevProps, prevState) {
        // Reset keystroke tracking when step changes
        if (prevProps.step?.id !== this.props.step?.id) {
            // Flush buffer for previous step
            if (this.context?.firebase && this.context.firebase.flushKeystrokeBuffer) {
                const problemID = this.context.problemID || "n/a";
                const stepID = prevProps.step?.id || "n/a";
                this.context.firebase.flushKeystrokeBuffer(problemID, stepID);
            }
            // Reset tracking state for new step
            this.lastInputLength = 0;
            this.lastKeystrokeTime = null;
        }
        
        if (prevState.isMathFieldFocused !== this.state.isMathFieldFocused && !this.state.isMathFieldFocused) {
            const mathField = this.mathFieldRef.current;
        if (mathField) {
            mathField.executeCommand('hideVirtualKeyboard');
            console.log("componentDidUpdate hide keyboard")
        }}
    }
    
    componentWillUnmount() {
        document.removeEventListener('click', this.handleClickOutside);
        
        // Flush keystroke buffer when component unmounts
        if (this.context?.firebase && this.context.firebase.flushKeystrokeBuffer) {
            const problemID = this.context.problemID || "n/a";
            const stepID = this.props.step?.id || "n/a";
            this.context.firebase.flushKeystrokeBuffer(problemID, stepID);
        }
    }
    
    handleFocus = () => {
        this.setState({ isMathFieldFocused: true });
        console.log('MathField is focused');
    };
    
    handleBlur = () => {
        this.setState({ isMathFieldFocused: false });
        console.log('MathField lost focus');
    };
    
    handleClickOutside = (event) => {
        const mathField = this.mathFieldRef.current;
        if (
          mathField &&
          !mathField.contains(event.target) &&
          this.state.isMathFieldFocused
        ) {
          console.log('Clicked outside keyboard');
        }
    };

    isMatrixInput() {
        if (this.props.step?.stepAnswer) {
            return this.props.step?.problemType !== "MultipleChoice" &&
                /\\begin{[a-zA-Z]?matrix}/.test(this.props.step.stepAnswer[0])
        }
        if (this.props.step?.hintAnswer) {
            return this.props.step?.problemType !== "MultipleChoice" &&
                /\\begin{[a-zA-Z]?matrix}/.test(this.props.step.hintAnswer[0])
        }
    }

    onEquationChange(eq) {
        const containerEl = this.equationRef?.current
        const eqContentEl = this.equationRef?.current?.querySelector(".mq-editable-field")

        const textareaEl = this.equationRef?.current?.querySelector(".mq-textarea > textarea")

        if (textareaEl != null) {
            // console.debug("not null!", textareaEl)
            textareaEl.ariaLabel = `The current value is: ${eq}. Answer question number ${this.props.index} here.`
        }

        if (containerEl != null && eqContentEl != null) {
            const eqContainer = eqContentEl.querySelector("*[mathquill-block-id]")
            if (eqContainer != null) {
                const tallestEqElement = Math.max(...Array.from(eqContainer.childNodes.values()).map(el => el.offsetHeight))
                const newHeight = Math.max(tallestEqElement + 20, 50)

                containerEl.style.height = `${newHeight}px`;
                eqContainer.style.height = `${newHeight}px`;
            }
        }
        
        // Track keystroke for math-field
        this.handleInputChange(eq);
        this.props.setInputValState(eq)
    }
    
    handleInputChange(newValue) {
        const currentLength = (newValue || "").length;
        const previousLength = this.lastInputLength;
        const now = Date.now();
        const timeSinceLastKeystroke = this.lastKeystrokeTime ? now - this.lastKeystrokeTime : 0;
        
        // Detect paste event: large text insertion (>10 characters at once)
        const lengthChange = currentLength - previousLength;
        const isPasteEvent = lengthChange > 10;
        
        // Log keystroke if Firebase is available
        if (this.context?.firebase && this.context.firebase.logKeystroke) {
            const problemID = this.context.problemID || "n/a";
            const stepID = this.props.step?.id || "n/a";
            
            console.debug("⌨️ Logging keystroke:", {
                problemID,
                stepID,
                currentLength,
                previousLength,
                lengthChange,
                isPasteEvent,
                timeSinceLastKeystroke
            });
            
            this.context.firebase.logKeystroke(
                problemID,
                stepID,
                currentLength,
                previousLength,
                timeSinceLastKeystroke,
                isPasteEvent,
                false // Don't flush unless buffer is full
            );
        } else {
            console.warn("⚠️ Firebase or logKeystroke not available:", {
                hasContext: !!this.context,
                hasFirebase: !!(this.context?.firebase),
                hasLogKeystroke: !!(this.context?.firebase?.logKeystroke)
            });
        }
        
        this.lastInputLength = currentLength;
        this.lastKeystrokeTime = now;
    }
    
    handlePaste(event) {
        // Paste event is handled by handleInputChange detecting large length change
        // But we can add additional tracking here if needed
    }

    render() {
        const { classes, state, index, showCorrectness, allowRetry, variabilization } = this.props;
        const { use_expanded_view, debug } = this.context;
        let { problemType, stepAnswer, hintAnswer, units } = this.props.step;
        const keepMCOrder = this.props.keepMCOrder;
        const keyboardType = this.props.keyboardType;

        const problemAttempted = state.isCorrect != null
        const correctAnswer = Array.isArray(stepAnswer) ? stepAnswer[0] : hintAnswer[0]
        const disableInput = problemAttempted && !allowRetry

        if (this.isMatrixInput()) {
            problemType = "MatrixInput"
        }
        
        try {
            window.mathVirtualKeyboard.layouts = [keyboardType];
        } catch {
            window.mathVirtualKeyboard.layouts = ["default"];
        }

        return (
            <Grid container spacing={0} justifyContent="center" alignItems="center"
                className={clsx(disableInput && 'disable-interactions')}>
                <Grid item xs={1} md={problemType === "TextBox" ? 4 : (problemType === "Coding" ? 1 : false)}/>
                <Grid item xs={9} md={problemType === "TextBox" ? 3 : (problemType === "Coding" ? 10 : 12)}>
                    {(problemType === "TextBox" && this.props.step.answerType !== "string") && (
                        <math-field
                            ref={this.mathFieldRef}
                            math-virtual-keyboard-policy="sandboxed"
                            onFocus={this.handleFocus}
                            onBlur={this.handleBlur}
                            onInput={(evt) => {
                                const value = evt.target.value;
                                this.handleInputChange(value);
                                this.props.setInputValState(value);
                            }}
                            style={{"display": "block"}}
                            value={(use_expanded_view && debug) ? correctAnswer : state.inputVal}
                            onChange={this.onEquationChange}
                            autoCommands={EQUATION_EDITOR_AUTO_COMMANDS}
                            autoOperatorNames={EQUATION_EDITOR_AUTO_OPERATORS}
                        >
                            </math-field>

                    )}               
                    {(problemType === "TextBox" && this.props.step.answerType === "string") && (
                        <TextField
                            ref={this.textFieldRef}
                            inputProps={{
                                min: 0,
                                style: { textAlign: 'center' },
                                "aria-label": "Enter a response to the question above"
                            }}
                            {...stagingProp({
                                "data-selenium-target": `string-answer-${index}`
                            })}
                            error={showCorrectness && state.isCorrect === false}
                            className={classes.inputField}
                            variant="outlined"
                            onChange={(evt) => {
                                this.handleInputChange(evt.target.value);
                                this.props.editInput(evt);
                            }}
                            onPaste={this.handlePaste}
                            onKeyPress={(evt) => this.props.handleKey(evt)}
                            InputProps={{
                                classes: {
                                    notchedOutline: ((showCorrectness && state.isCorrect !== false && state.usedHints) ? classes.muiUsedHint : null)
                                }
                            }}
                            {...(use_expanded_view && debug) ? {
                                defaultValue: correctAnswer
                            } : {}}
                        >
                        </TextField>
                    )}
                    {(problemType === "TextBox" && this.props.step.answerType === "short-essay") && (
                        <textarea
                            className="short-essay-input"
                            onChange={(evt) => {
                                this.handleInputChange(evt.target.value);
                                this.props.editInput(evt);
                            }}
                            onPaste={this.handlePaste}
                            onKeyPress={(evt) => this.props.handleKey(evt)}
                        >
                        </textarea>
                    )}
                                        {(problemType === "MultipleChoice" && keepMCOrder) ? (
                        <MultipleChoice
                            onChange={(evt) => this.props.editInput(evt)}
                            choices={[...this.props.step.choices].reverse()}
                            index={index}
                            {...(use_expanded_view && debug) ? {
                                defaultValue: correctAnswer
                            } : {}}
                            variabilization={variabilization}
                        />
                    ) :
                    (problemType === "MultipleChoice") && (
                        <MultipleChoice
                            onChange={(evt) => this.props.editInput(evt)}
                            choices={shuffleArray(this.props.step.choices, this.props.seed)}
                            index={index}
                            {...(use_expanded_view && debug) ? {
                                defaultValue: correctAnswer
                            } : {}}
                            variabilization={variabilization}
                        />
                    )}
                    {problemType === "GridInput" && (
                        <GridInput
                            onChange={(newVal) => this.props.setInputValState(newVal)}
                            numRows={this.props.step.numRows}
                            numCols={this.props.step.numCols}
                            context={this.props.context}
                            classes={this.props.classes}
                            index={index}
                            {...(use_expanded_view && debug) ? {
                                defaultValue: parseMatrixTex(correctAnswer)[0]
                            } : {}}
                        />
                    )}
                    {problemType === "MatrixInput" && (
                        <MatrixInput
                            onChange={(newVal) => this.props.setInputValState(newVal)}
                            numRows={this.props.step.numRows}
                            numCols={this.props.step.numCols}
                            context={this.props.context}
                            classes={this.props.classes}
                            index={index}
                            {...(use_expanded_view && debug) ? {
                                defaultValue: parseMatrixTex(correctAnswer)[0]
                            } : {}}
                        />
                    )}
                    {problemType === "Coding" && (
                        <SimpleCodeEditor
                            step={this.props.step}
                            setInputValState={this.props.setInputValState}
                            index={index}
                            classes={this.props.classes}
                            problemTitle={this.props.problemTitle || ""}
                            problemBody={this.props.problemBody || ""}
                            onValidationReady={(validateFunc) => {
                                // Store validation function for later use
                                this.codingValidation = validateFunc;
                            }}
                        />
                    )}
                </Grid>
                <Grid item xs={2} md={1}>
                    <div style={{ marginLeft: "20%" }}>
                        {units && renderText(units, this.context.problemID, variabilization, this.context)}
                    </div>
                </Grid>
                <Grid item xs={false} md={problemType === "TextBox" ? 3 : (problemType === "Coding" ? 1 : false)}/>
            </Grid>
        )
    }
}

export default ProblemInput
