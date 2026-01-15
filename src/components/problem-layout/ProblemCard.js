import React from "react";

import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import { fetchDynamicHint } from "./DynamicHintHelper";

import { checkAnswer } from "../../platform-logic/checkAnswer.js";
import styles from "./common-styles.js";
import { withStyles } from "@material-ui/core/styles";
import HintSystem from "./HintSystem.js";
import {
    chooseVariables,
    renderText,
} from "../../platform-logic/renderText.js";
import {
    DYNAMIC_HINT_URL,
    DYNAMIC_HINT_TEMPLATE,
    ThemeContext,
} from "../../config/config.js";

import "./ProblemCard.css";
import ProblemInput from "../problem-input/ProblemInput";
import Spacer from "../Spacer";
import { stagingProp } from "../../util/addStagingProperty";
import ErrorBoundary from "../ErrorBoundary";
import DynamicHintButton from "./DynamicHintButton";
import {
    toastNotifyCompletion,
    toastNotifyCorrectness, toastNotifyEmpty
} from "./ToastNotifyCorrectness";
import { joinList } from "../../util/formListString";
import withTranslation from "../../util/withTranslation.js"
import CryptoJS from "crypto-js";

class ProblemCard extends React.Component {
    static contextType = ThemeContext;

    constructor(props, context) {
        super(props);
        //console.log("problem lesson props:", props);

        this.translate = props.translate || (() => '');
        this.step = props.step;
        this.index = props.index;
        
        // Guard against missing step
        if (!this.step) {
            console.error('ProblemCard: step is undefined');
        }
        this.giveStuFeedback = props.giveStuFeedback;
        this.giveStuHints = props.giveStuHints;
        this.unlockFirstHint = props.unlockFirstHint;
        this.giveHintOnIncorrect = props.giveHintOnIncorrect
        this.keepMCOrder = props.keepMCOrder;
        this.keyboardType = props.keyboardType;
        this.allowRetry = this.giveStuFeedback;

        this.giveStuBottomHint = props.giveStuBottomHint;
        this.giveDynamicHint = props.giveDynamicHint;
        this.showHints = this.giveStuHints == null || this.giveStuHints;
        this.showCorrectness = this.giveStuFeedback;
        this.expandFirstIncorrect = false;

        this.problemTitle = props.problemTitle;
        this.problemSubTitle = props.problemSubTitle;
        this.prompt_template = props.prompt_template
            ? props.prompt_template
            : DYNAMIC_HINT_TEMPLATE;
        console.debug(
            "this.step",
            this.step,
            "showHints",
            this.showHints,
            "hintPathway",
            context && context.hintPathway
        );
        // Safely extract hints, ensuring it's always an array
        let hintsArray = [];
        if (!this.giveDynamicHint && this.step && this.step.hints) {
            const hintPathway = (context && context.hintPathway) || 'DefaultPathway';
            const hintsForPathway = this.step.hints[hintPathway];
            if (Array.isArray(hintsForPathway)) {
                try {
                    hintsArray = JSON.parse(JSON.stringify(hintsForPathway));
                } catch (e) {
                    console.warn('Error parsing hints:', e);
                    hintsArray = [];
                }
            } else if (hintsForPathway && typeof hintsForPathway === 'object') {
                // Handle case where hints might be nested incorrectly
                console.warn('Hints structure is not an array, attempting to fix...');
                hintsArray = [];
            }
        }
        this.hints = hintsArray;

        for (let hint of this.hints) {
            // Safely handle dependencies
            if (hint.dependencies && Array.isArray(hint.dependencies)) {
                hint.dependencies = hint.dependencies.map((dependency) =>
                    this._findHintId(this.hints, dependency)
                );
            } else {
                hint.dependencies = [];
            }
            
            // Safely handle subHints
            if (hint.subHints && Array.isArray(hint.subHints)) {
                for (let subHint of hint.subHints) {
                    if (subHint.dependencies && Array.isArray(subHint.dependencies)) {
                        subHint.dependencies = subHint.dependencies.map(
                            (dependency) =>
                                this._findHintId(hint.subHints, dependency)
                        );
                    } else {
                        subHint.dependencies = [];
                    }
                }
            }
        }

        // Bottom out hints option
        if (
            this.giveStuBottomHint &&
            !(context && context.debug && context["use_expanded_view"])
        ) {
            // Bottom out hints
            const stepAnswerStr = this.step.stepAnswer 
                ? (Array.isArray(this.step.stepAnswer) 
                    ? this.step.stepAnswer.join(', ') 
                    : String(this.step.stepAnswer))
                : '';
            this.hints.push({
                id: this.step.id + "-h" + (this.hints.length + 1),
                title: this.translate('hintsystem.answer'),
                text: this.translate('hintsystem.answerIs') + stepAnswerStr,
                type: "bottomOut",
                dependencies: Array.from(Array(this.hints.length).keys()),
            });
            // Bottom out sub hints
            this.hints.map((hint, i) => {
                if (hint.type === "scaffold") {
                    if (hint.subHints == null) {
                        hint.subHints = [];
                    }
                    const hintAnswerStr = hint.hintAnswer && Array.isArray(hint.hintAnswer) && hint.hintAnswer.length > 0
                        ? hint.hintAnswer[0]
                        : '';
                    hint.subHints.push({
                        id:
                            this.step.id +
                            "-h" +
                            i +
                            "-s" +
                            (hint.subHints.length + 1),
                        title: this.translate('hintsystem.answer'),
                        text: this.translate('hintsystem.answerIs') + hintAnswerStr,
                        type: "bottomOut",
                        dependencies: Array.from(
                            Array(hint.subHints.length).keys()
                        ),
                    });
                }
                return null;
            });
        }

        this.state = {
            inputVal: "",
            isCorrect: (context && context.use_expanded_view && context.debug) ? true : null,
            checkMarkOpacity:
                (context && context.use_expanded_view && context.debug) ? "100" : "0",
            displayHints: false,
            hintsFinished: new Array(this.hints.length).fill(0),
            equation: "",
            usedHints: false,
            dynamicHint: "",
            bioInfo: "",
            enableHintGeneration: true,
            activeHintType: "none", // "none", or "normal".
            hints: this.hints,
            // When we are currently streaming the response from ChatGPT, this variable is `true`
            isGeneratingHint: false, 
            lastAIHintHash: null,
        };

         // This is used for AI hint generation
         if (this.giveDynamicHint) {
            const gptHint = {
                id: this.step.id + "-h0",  // Unique ID for the GPT hint
                title: "ChatGPT AI Hint",  // Translated title
                text: "Loading...",
                type: "gptHint",  // Custom type for GPT hint
                dependencies: [],
            };
        
            this.hints.unshift(gptHint);
        }
    }

    hashAnswer = (answer) => {
        return CryptoJS.SHA256(answer).toString();
    };

    _findHintId = (hints, targetId) => {
        for (var i = 0; i < hints.length; i++) {
            if (hints[i].id === targetId) {
                return i;
            }
        }
        console.debug("hint not found..?", hints, "target:", targetId);
        return -1;
    };

    // TODO: Incorporate this in the AI Hinting workflow
    updateBioInfo() {
        const bioInfo = JSON.parse(localStorage.getItem("bioInfo"));
        if (bioInfo) {
            const {
                gender,
                age,
                confidenceQ1,
                confidenceQ2,
                judgementQ1,
                judgementQ2,
                judgementQ3,
                other,
            } = bioInfo;
            const bio = `I'm a ${gender} and I'm ${age} years old. ${confidenceQ1}. ${confidenceQ2}. 
            For the statement that "if I had more time for practice, I would be better in mathematics", my answer is ${judgementQ1}.
            For the statement that "if I was more patient while solving mathematical problems, I would be better in mathematics", my answer is ${judgementQ2}.
            For the statement that "No matter how much time I devote for studying mathematics, I can’t improve my grades", my answer is ${judgementQ3}. 
            ${other}
            `;
            this.setState({ bioInfo: bio });
        }
    }

    componentDidMount() {
        // Start an asynchronous task
        this.updateBioInfo();
        console.log("student show hints status: ", this.showHints);
    }

    componentDidUpdate(prevProps) {
        // Check if specific props have changed
        if (
            this.props.clearStateOnPropChange !==
            prevProps.clearStateOnPropChange
        ) {
            // Clear out state variables
            this.setState({
                dynamicHint: "",
            });
            this.updateBioInfo();
        }
    }

    submit = async () => {
        console.debug("submitting problem");
        const { inputVal, hintsFinished } = this.state;
        const {
            variabilization,
            knowledgeComponents,
            precision,
            stepAnswer,
            answerType,
            stepBody,
            stepTitle,
        } = this.step;
        const { seed, problemVars, problemID, courseName, answerMade, lesson } =
            this.props;

        if (inputVal === '') {
            toastNotifyEmpty(this.translate)
            return;
        }

        // For coding problems, use the CodeEditor's validation function
        let isCorrect = false;
        let parsed = inputVal;
        let reason = null;
        
        if (this.step.problemType === 'Coding' && this.codingValidation) {
            // Run test cases and validate
            try {
                isCorrect = await this.codingValidation();
                parsed = inputVal;
                // If validation fails, provide a reason
                if (!isCorrect) {
                    reason = "One or more test cases failed. Please check your code output against the expected results.";
                }
            } catch (error) {
                console.error('Error validating coding problem:', error);
                isCorrect = false;
                reason = "Error running test cases. Please try again.";
            }
        } else {
            // For non-coding problems, use the standard checkAnswer
            const [parsedResult, correctAnswer, reasonResult] = checkAnswer({
                attempt: inputVal,
                actual: stepAnswer,
                answerType: answerType,
                precision: precision,
                problemType: this.step.problemType,
                variabilization: chooseVariables(
                    Object.assign({}, problemVars, variabilization),
                    seed
                ),
                questionText: stepBody.trim() || stepTitle.trim(),
            });
            
            parsed = parsedResult;
            isCorrect = !!correctAnswer;
            reason = reasonResult;
        }

        // Flush keystroke buffer before logging answer submission
        if (this.context.firebase && this.context.firebase.flushKeystrokeBuffer) {
            console.log("🔄 Flushing keystroke buffer on answer submit");
            this.context.firebase.flushKeystrokeBuffer(problemID, this.step.id);
        } else {
            console.warn("⚠️ Cannot flush keystroke buffer - Firebase not available");
        }

        this.context.firebase.log(
            parsed,
            problemID,
            this.step,
            null,
            isCorrect,
            hintsFinished,
            "answerStep",
            chooseVariables(
                Object.assign({}, problemVars, variabilization),
                seed
            ),
            lesson,
            courseName,
            this.giveDynamicHint ? "dynamic" : "regular",
            this.state.dynamicHint,
            this.state.bioInfo
        );

        if (this.showCorrectness) {
            toastNotifyCorrectness(isCorrect, reason, this.translate);
        } else {
            toastNotifyCompletion(this.translate);
        }

        this.setState({
            isCorrect,
            checkMarkOpacity: isCorrect ? "100" : "0",
        });
        answerMade(this.index, knowledgeComponents, isCorrect);
    };

    editInput = (event) => {
        this.setInputValState(event.target.value);
        this.setState({
            enableHintGeneration: true,
        });
    };

    setInputValState = (inputVal) => {
        this.setState(({ isCorrect }) => ({
            inputVal,
            isCorrect: isCorrect ? true : null,
        }));
    };

    handleKey = (event) => {
        if (event.key === "Enter") {
            this.submit();
        }
    };

    toggleHints = (event) => {
        if (this.giveDynamicHint && !this.state.activeHintType !== "normal") {
            this.generateHintFromGPT();
        } else if (!this.state.displayHints) {
            this.setState(
                () => ({
                    enableHintGeneration: false,
            }))
        }
        this.setState(
            (prevState) => ({
                activeHintType: prevState.activeHintType === "normal" ? "none" : "normal"
                }),
            () => {
                this.props.answerMade(
                    this.index,
                    this.step.knowledgeComponents,
                    false
                );
            }
        );
    };

    unlockHint = (hintNum, hintType) => {
        // Mark question as wrong if hints are used (on the first time)
        const { seed, problemVars, problemID, courseName, answerMade, lesson } =
            this.props;
        const { isCorrect, hintsFinished } = this.state;
        const { knowledgeComponents, variabilization } = this.step;

        if (hintsFinished.reduce((a, b) => a + b) === 0 && isCorrect !== true) {
            this.setState({ usedHints: true });
            answerMade(this.index, knowledgeComponents, false);
        }

        // If the user has not opened a scaffold before, mark it as in-progress.
        if (hintsFinished[hintNum] !== 1) {
            this.setState(
                (prevState) => {
                    prevState.hintsFinished[hintNum] =
                        hintType !== "scaffold" ? 1 : 0.5;
                    return { hintsFinished: prevState.hintsFinished };
                },
                () => {
                    const { firebase } = this.context;

                    firebase.log(
                        null,
                        problemID,
                        this.step,
                        this.hints[hintNum],
                        null,
                        hintsFinished,
                        "unlockHint",
                        chooseVariables(
                            Object.assign({}, problemVars, variabilization),
                            seed
                        ),
                        lesson,
                        courseName,
                        this.giveDynamicHint ? "dynamic" : "regular",
                        this.state.dynamicHint,
                        this.state.bioInfo
                    );
                }
            );
        }
    };

    submitHint = (parsed, hint, isCorrect, hintNum) => {
        if (isCorrect) {
            this.setState((prevState) => {
                prevState.hintsFinished[hintNum] = 1;
                return { hintsFinished: prevState.hintsFinished };
            });
        }
        this.context.firebase.hintLog(
            parsed,
            this.props.problemID,
            this.step,
            hint,
            isCorrect,
            this.state.hintsFinished,
            chooseVariables(
                Object.assign(
                    {},
                    this.props.problemVars,
                    this.step.variabilization
                ),
                this.props.seed
            ),
            this.props.lesson,
            this.props.courseName,
            this.giveDynamicHint ? "dynamic" : "regular",
            this.state.dynamicHint,
            this.state.bioInfo
        );
    };

    generateGPTHintParameters = (prompt_template, bio_info) => {
        let inputVal = this.state.inputVal || "The student did not provide an answer.";
        let correctAnswer = Array.isArray(this.step.stepAnswer) ? this.step.stepAnswer[0] : "";
        const problemTitle = this.problemTitle || "Problem Title";
        const problemSubTitle = this.problemSubTitle || "Problem Subtitle";
        const questionTitle = this.step.stepTitle || "Question Title";
        const questionSubTitle = this.step.stepBody || "Question Subtitle";

        // Replace placeholders in the template with actual values
        const promptContent = prompt_template
            .replace("{problem_title}", problemTitle)
            .replace("{problem_subtitle}", problemSubTitle)
            .replace("{question_title}", questionTitle)
            .replace("{question_subtitle}", questionSubTitle)
            .replace("{student_answer}", inputVal)
            .replace("{correct_answer}", correctAnswer);
        return  {
            role: "user",
            message: promptContent
            }
        };

    generateHintFromGPT = async (forceRegenerate) => {
        const { inputVal, lastAIHintHash, isGeneratingHint } = this.state;

        const currentHash = this.hashAnswer(inputVal);

        // If a hint is currently being generated through streaming, 
        // do not generate a new hint
        if (isGeneratingHint) {
            return;
        }

        // If the current hash matches the last hash, skip regeneration
        // If forceRegenerate is true, the regenerate button was pressed
        if ((currentHash === lastAIHintHash) && !forceRegenerate) {
            console.log("Hint already generated for this answer, skipping regeneration.");
            return;
        }

        this.setState({
            dynamicHint: "Loading...", // Clear previous hint
            isGeneratingHint: true,
            lastAIHintHash: currentHash,
        });
    
        const [parsed, correctAnswer] = checkAnswer({
            attempt: this.state.inputVal,
            actual: this.step.stepAnswer,
            answerType: this.step.answerType,
            precision: this.step.precision,
            problemType: this.step.problemType,
            variabilization: chooseVariables(
                Object.assign(
                    {},
                    this.props.problemVars,
                    this.props.variabilization
                ),
                this.props.seed
            ),
            questionText:
                this.step.stepBody.trim() || this.step.stepTitle.trim(),
        });
    
        const isCorrect = !!correctAnswer;
    
        // Define callbacks
        const onChunkReceived = (streamedHint) => {
            this.setState((prevState) => ({
                hints: prevState.hints.map((hint) =>
                    hint.type === "gptHint"
                        ? { ...hint, text: streamedHint || this.translate("hintsystem.errorHint") }
                        : hint
                ),
            }));
        };

        /** When the hint generation is completed, set the `isGeneratingHint` state to false
         * in order to regenerate the hint.
         */
        const onSuccessfulCompletion = () => {
            this.setState({
                isGeneratingHint: false,
            });
        }
    
        /** When we receive an error in the hint generation process,
         *  revert back to manual hints.
         */
        const onError = (error) => {
            this.setState({
                isGeneratingHint: false,
            })
            console.error("Error generating AI hint:", error);
        
            // Safely extract hints, ensuring it's always an array
            const hintPathway = this.context.hintPathway || 'DefaultPathway';
            const hintsForPathway = this.step.hints[hintPathway];
            if (Array.isArray(hintsForPathway)) {
                this.hints = JSON.parse(JSON.stringify(hintsForPathway));
            } else {
                console.warn('Hints structure is not an array in componentDidUpdate, resetting to empty array');
                this.hints = [];
            }
            for (let hint of this.hints) {
                hint.dependencies = hint.dependencies.map((dependency) =>
                    this._findHintId(this.hints, dependency)
                );
                if (hint.subHints) {
                    for (let subHint of hint.subHints) {
                        subHint.dependencies = subHint.dependencies.map(
                            (dependency) =>
                                this._findHintId(hint.subHints, dependency)
                        );
                    }
                }
            }

                // Bottom out hints option
            if (
                this.giveStuBottomHint
            ) {
                // Bottom out hints
                this.hints.push({
                    id: this.step.id + "-h" + (this.hints.length + 1),
                    title: this.translate('hintsystem.answer'),
                    text: this.translate('hintsystem.answerIs') + this.step.stepAnswer,
                    type: "bottomOut",
                    dependencies: Array.from(Array(this.hints.length).keys()),
                });
                // Bottom out sub hints
                this.hints.map((hint, i) => {
                    if (hint.type === "scaffold") {
                        if (hint.subHints == null) {
                            hint.subHints = [];
                        }
                        hint.subHints.push({
                            id:
                                this.step.id +
                                "-h" +
                                i +
                                "-s" +
                                (hint.subHints.length + 1),
                            title: this.translate('hintsystem.answer'),
                            text: this.translate('hintsystem.answerIs') + hint.hintAnswer[0],
                            type: "bottomOut",
                            dependencies: Array.from(
                                Array(hint.subHints.length).keys()
                            ),
                        });
                    }
                    return null;
                });
            }
        
            this.setState({
                hints: this.hints,
                giveDynamicHint: false, // Switch to manual hints
                activeHintType: "normal",
                dynamicHint: "Failed to generate AI hint. Displaying manual hints.",
                hintsFinished: new Array(this.hints.length).fill(0),
            });
        };            
    
        // Call ChatGPT to fetch the dynamic hint using streaming
        fetchDynamicHint(
            DYNAMIC_HINT_URL,
            this.generateGPTHintParameters(this.prompt_template, this.state.bioInfo),
            onChunkReceived,
            onSuccessfulCompletion,
            onError,
            this.props.problemID,
            chooseVariables(
                Object.assign(
                    {},
                    this.props.problemVars,
                    this.step.variabilization
                ),
                this.props.seed
            ),
            this.context
        );
    
        // TODO: Update firebase logging to log when
        // 1. The dynamic hint is opened
        // 2. The regenerate button is clicked
        this.context.firebase.log(
            parsed,
            this.props.problemID,
            this.step,
            "",
            isCorrect,
            this.state.hintsFinished,
            "requestDynamicHint",
            chooseVariables(
                Object.assign(
                    {},
                    this.props.problemVars,
                    this.props.variabilization
                ),
                this.props.seed
            ),
            this.props.lesson,
            this.props.courseName,
            "dynamic",
            this.state.dynamicHint,
            this.state.bioInfo
        );
    };
        

    render() {
        const { translate } = this.props;
        const { classes, problemID, problemVars, seed } = this.props;
        const { isCorrect } = this.state;
        const { debug, use_expanded_view } = this.context;

        const problemAttempted = isCorrect != null;

        return (
            <Card className={classes.card}>
                <CardContent>
                    <h2 className={classes.stepHeader}>
                        {renderText(
                            this.step.stepTitle,
                            problemID,
                            chooseVariables(
                                Object.assign(
                                    {},
                                    problemVars,
                                    this.step.variabilization
                                ),
                                seed
                            ),
                            this.context
                        )}
                        <hr />
                    </h2>

                    {/* Dynamic Hint Button */}
                    {this.step && (
                        <DynamicHintButton
                            userAnswer={this.state.inputVal || ''}
                            correctAnswer={
                                this.step.problemType === 'Coding' 
                                    ? (this.step.testCases || [])
                                    : (this.step.stepAnswer || '')
                            }
                            problemStatement={
                                (this.problemTitle || '') + 
                                (this.problemSubTitle ? ' ' + this.problemSubTitle : '')
                            }
                            stepStatement={
                                (this.step.stepTitle || '') + 
                                (this.step.stepBody ? ' ' + this.step.stepBody : '')
                            }
                            lessonContext={
                                (this.props.courseName || '') + 
                                (this.props.lesson?.name ? ' > ' + this.props.lesson.name : '') +
                                (this.props.lesson?.topics ? ': ' + this.props.lesson.topics : '')
                            }
                            problemType={this.step.problemType || 'TextBox'}
                            problemID={this.props.problemID}
                            stepID={this.step.id}
                            courseName={this.props.courseName}
                            lesson={this.props.lesson?.name || this.props.lesson}
                        />
                    )}

                    <div className={classes.stepBody}>
                        {renderText(
                            this.step.stepBody,
                            problemID,
                            chooseVariables(
                                Object.assign(
                                    {},
                                    problemVars,
                                    this.step.variabilization
                                ),
                                seed
                            ),
                            this.context
                        )}
                    </div>
                    {(this.state.activeHintType === "normal" || (debug && use_expanded_view)) &&
                        this.showHints && (
                            <div className="Hints">
                                <ErrorBoundary
                                    componentName={"HintSystem"}
                                    descriptor={"hint"}
                                >
                                    <HintSystem
                                        key={`hints-${this.giveDynamicHint ? 'dynamic' : 'manual'}`}
                                        giveHintOnIncorrect={this.giveHintOnIncorrect}
                                        giveDynamicHint={this.giveDynamicHint}
                                        giveStuFeedback={this.giveStuFeedback}
                                        unlockFirstHint={this.unlockFirstHint}
                                        problemID={this.props.problemID}
                                        index={this.props.index}
                                        step={this.step}
                                        hints={this.state.hints}
                                        unlockHint={this.unlockHint}
                                        hintStatus={this.state.hintsFinished}
                                        submitHint={this.submitHint}
                                        seed={this.props.seed}
                                        stepVars={Object.assign(
                                            {},
                                            this.props.problemVars,
                                            this.step.variabilization
                                        )}
                                        answerMade={this.props.answerMade}
                                        lesson={this.props.lesson}
                                        courseName={this.props.courseName}
                                        isIncorrect={this.expandFirstIncorrect}
                                        generateHintFromGPT={this.generateHintFromGPT}
                                        isGeneratingHint={this.state.isGeneratingHint}
                                    />
                                </ErrorBoundary>
                                <Spacer />
                            </div>
                        )}

                    <div className={classes.root}>
                        <ProblemInput
                            variabilization={chooseVariables(
                                Object.assign(
                                    {},
                                    this.props.problemVars,
                                    this.step.variabilization
                                ),
                                this.props.seed
                            )}
                            allowRetry={this.allowRetry}
                            giveStuFeedback={this.giveStuFeedback}
                            showCorrectness={this.showCorrectness}
                            classes={classes}
                            state={this.state}
                            step={this.step}
                            seed={this.props.seed}
                            keepMCOrder={this.props.keepMCOrder}
                            keyboardType={this.props.keyboardType}
                            _setState={(state) => this.setState(state)}
                            context={this.context}
                            editInput={this.editInput}
                            setInputValState={this.setInputValState}
                            handleKey={this.handleKey}
                            index={this.props.index}
                            problemTitle={this.problemTitle || ""}
                            problemBody={this.problemSubTitle || ""}
                        />
                    </div>
                </CardContent>
                <CardActions>
                    <Grid
                        container
                        spacing={0}
                        justifyContent="center"
                        alignItems="center"
                    >
                        <Grid item xs={false} sm={false} md={4} />
                        <Grid item xs={4} sm={4} md={1}>
                            {this.showHints && (
                                <center>
                                    <IconButton
                                        aria-label="delete"
                                        onClick={this.toggleHints}
                                        title="View available hints"
                                        disabled={
                                            !this.state.enableHintGeneration
                                        }
                                        className="image-container"
                                        {...stagingProp({
                                            "data-selenium-target": `hint-button-${this.props.index}`,
                                        })}
                                    >
                                        <img
                                            src={`${process.env.PUBLIC_URL}/static/images/icons/raise_hand.png`}
                                            className={
                                                this.state.enableHintGeneration
                                                    ? "image"
                                                    : "image image-grayed-out"
                                            }
                                            alt="hintToggle"
                                        />
                                    </IconButton>
                                </center>
                            )}
                        </Grid>
                        <Grid item xs={4} sm={4} md={2}>
                            <center>
                                <Button
                                    className={classes.button}
                                    style={{ width: "80%" }}
                                    size="small"
                                    onClick={this.submit}
                                    disabled={
                                        (use_expanded_view && debug) ||
                                        (!this.allowRetry && problemAttempted)
                                    }
                                    {...stagingProp({
                                        "data-selenium-target": `submit-button-${this.props.index}`,
                                    })}
                                >
                                    {translate('problem.Submit')}
                                </Button>
                            </center>
                        </Grid>
                        <Grid item xs={4} sm={3} md={1}>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    alignContent: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {(!this.showCorrectness ||
                                    !this.allowRetry) && (
                                    <img
                                        className={classes.checkImage}
                                        style={{
                                            opacity:
                                                this.state.isCorrect == null
                                                    ? 0
                                                    : 1,
                                            width: "45%",
                                        }}
                                        alt="Exclamation Mark Icon"
                                        title={`The instructor has elected to ${joinList(
                                            !this.showCorrectness &&
                                                "hide correctness",
                                            !this.allowRetry &&
                                                "disallow retries"
                                        )}`}
                                        {...stagingProp({
                                            "data-selenium-target": `step-correct-img-${this.props.index}`,
                                        })}
                                        src={`${process.env.PUBLIC_URL}/static/images/icons/exclamation.svg`}
                                    />
                                )}
                                {this.state.isCorrect &&
                                    this.showCorrectness &&
                                    this.allowRetry && (
                                        <img
                                            className={classes.checkImage}
                                            style={{
                                                opacity:
                                                    this.state.checkMarkOpacity,
                                                width: "45%",
                                            }}
                                            alt="Green Checkmark Icon"
                                            {...stagingProp({
                                                "data-selenium-target": `step-correct-img-${this.props.index}`,
                                            })}
                                            src={`${process.env.PUBLIC_URL}/static/images/icons/green_check.svg`}
                                        />
                                    )}
                                {this.state.isCorrect === false &&
                                    this.showCorrectness &&
                                    this.allowRetry && (
                                        <img
                                            className={classes.checkImage}
                                            style={{
                                                opacity:
                                                    100 -
                                                    this.state.checkMarkOpacity,
                                                width: "45%",
                                            }}
                                            alt="Red X Icon"
                                            {...stagingProp({
                                                "data-selenium-target": `step-correct-img-${this.props.index}`,
                                            })}
                                            src={`${process.env.PUBLIC_URL}/static/images/icons/error.svg`}
                                        />
                                    )}
                            </div>
                        </Grid>
                        <Grid item xs={false} sm={1} md={4} />
                    </Grid>
                </CardActions>
            </Card>
        );
    }
}

export default withStyles(styles)(withTranslation(ProblemCard));
