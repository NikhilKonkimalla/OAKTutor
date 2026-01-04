import {
    CURRENT_SEMESTER,
    DO_LOG_DATA,
    DO_LOG_MOUSE_DATA,
    DO_LOG_KEYSTROKES,
    ENABLE_FIREBASE,
    GRANULARITY,
    MAX_BUFFER_SIZE,
    KEYSTROKE_BUFFER_SIZE,
} from "../config/config.js";

import { initializeApp } from "firebase/app";
import {
    arrayUnion,
    doc,
    getFirestore,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";
import daysSinceEpoch from "../util/daysSinceEpoch";
import {
    IS_PRODUCTION,
    IS_STAGING_CONTENT,
    IS_STAGING_OR_DEVELOPMENT,
    IS_STAGING_PLATFORM,
} from "../util/getBuildType";

const problemSubmissionsOutput = "problemSubmissions";
const problemStartLogOutput = "problemStartLogs";
const feedbackOutput = "feedbacks";
const siteLogOutput = "siteLogs";
const focusStatus = "focusStatus";
const hintTrackingOutput = "hintTracking";
const keystrokeLogOutput = "keystrokeLogs";

class Firebase {
    constructor(oats_user_id, credentials, treatment, siteVersion, ltiContext) {
        if (!ENABLE_FIREBASE) {
            console.debug("Not using firebase for logging");
            return;
        }
        
        try {
            const app = initializeApp(credentials);
            this.oats_user_id = oats_user_id;
            this.db = getFirestore(app);
            this.treatment = treatment;
            this.siteVersion = siteVersion;
            this.mouseLogBuffer = [];
            this.keystrokeBuffer = [];
            this.lastKeystrokeTime = null;
            this.lastInputLength = 0;
            this.keystrokeFlushTimer = null; // Timer for periodic flushing
            this.ltiContext = ltiContext;
            
            if (IS_STAGING_OR_DEVELOPMENT) {
                console.debug("Firebase initialized successfully", {
                    projectId: credentials.projectId,
                    userId: oats_user_id
                });
            }
        } catch (error) {
            console.error("Firebase initialization error:", error);
            throw error; // Re-throw to be caught by App.js
        }
    }

    getCollectionName(targetCollection) {
        const cond1 =
            IS_STAGING_CONTENT &&
            [feedbackOutput, siteLogOutput].includes(targetCollection);
        const cond2 =
            IS_STAGING_PLATFORM && [siteLogOutput].includes(targetCollection);

        return IS_PRODUCTION || cond1 || cond2
            ? targetCollection
            : `development_${targetCollection}`;
    }

    /**
     * Instead of creating a new doc, pushes to an array instead.
     * @param _collection
     * @param documentId
     * @param arrField
     * @param data
     * @param doPartitioning partition data into a sub-collection's documents (for large amount of data)
     * @param partitionFn
     * @returns {Promise<void>}
     */
    async pushDataToArr(
        _collection,
        documentId,
        arrField,
        data,
        doPartitioning = false,
        partitionFn = daysSinceEpoch
    ) {
        if (!ENABLE_FIREBASE) return;
        const collection = this.getCollectionName(_collection);
        const payload = this.addMetaData(data, true);

        if (IS_STAGING_OR_DEVELOPMENT) {
            console.debug(`Upserting document: ${documentId}, with ${data}`);
        }

        const path = [this.db, collection, documentId];
        if (doPartitioning) {
            path.push("partitions", partitionFn().toString());
        }
        const docRef = doc(...path);
        await setDoc(
            docRef,
            {
                [arrField]: arrayUnion(payload),
            },
            {
                merge: true,
            }
        ).catch((err) => {
            console.log("a non-critical error occurred.");
            console.debug(err);
        });
    }

    /*
      Collection: Collection of Key/Value pairs
      Document: Key - How you will access this data later. Usually username
      Data: Value - JSON object of data you want to store
    */
    async writeData(_collection, data) {
        if (!ENABLE_FIREBASE) {
            console.debug("Firebase logging disabled, skipping writeData");
            return;
        }
        
        if (!this.db) {
            console.error("Firebase database not initialized. Cannot write data.");
            return;
        }
        
        const collection = this.getCollectionName(_collection);
        const payload = this.addMetaData(data);

        if (IS_STAGING_OR_DEVELOPMENT) {
            // console.log("payload: ", payload);
            console.debug("Writing this payload to firebase: ", payload);
        }

        try {
            const docId = this._getReadableID();
            const docRef = doc(this.db, collection, docId);
            
            if (IS_STAGING_OR_DEVELOPMENT) {
                console.log(`📝 Attempting to write to Firestore:`, {
                    collection: collection,
                    documentId: docId
                });
            }
            
            await setDoc(docRef, payload);
            
            console.log(`✅ Successfully wrote to Firestore collection: ${collection}`, {
                documentId: docId
            });
        } catch (err) {
            console.error("Firebase writeData error:", err);
            console.error("Collection:", collection);
            console.error("Error details:", {
                code: err.code,
                message: err.message,
                stack: err.stack
            });
            // Re-throw for critical errors that need to be handled upstream
            if (err.code === 'permission-denied') {
                console.error("PERMISSION DENIED: Check your Firestore security rules!");
            }
        }
    }

    /**
     *
     * @param data
     * @param isArrayElement if true, cannot use FieldValue methods like serverTimestamp()
     * @returns {{[p: string]: *}}
     */
    addMetaData(data, isArrayElement = false) {
        const _payload = {
            semester: CURRENT_SEMESTER,
            siteVersion: this.siteVersion,
            siteCommitHash: process.env.REACT_APP_COMMIT_HASH,
            oats_user_id: this.oats_user_id,
            treatment: this.treatment,
            time_stamp: Date.now(),

            ...(process.env.REACT_APP_STUDY_ID
                ? {
                      study_id: process.env.REACT_APP_STUDY_ID,
                  }
                : {}),

            ...(!isArrayElement
                ? {
                      server_time: serverTimestamp(),
                  }
                : {}),

            ...(this.ltiContext?.user_id
                ? {
                      course_id: this.ltiContext.course_id,
                      course_name: this.ltiContext.course_name,
                      course_code: this.ltiContext.course_code,

                      lms_user_id: this.ltiContext.user_id,
                  }
                : {
                      course_id: "n/a",
                      course_name: "n/a",
                      course_code: "n/a",

                      lms_user_id: "n/a",
                  }),

            ...data,
        };
        return Object.fromEntries(
            Object.entries(_payload).map(([key, val]) => [
                key,
                typeof val === "undefined" ? null : val,
            ])
        );
    }

    _getReadableID() {
        const today = new Date();
        return (
            ("0" + (today.getMonth() + 1)).slice(-2) +
            "-" +
            ("0" + today.getDate()).slice(-2) +
            "-" +
            today.getFullYear() +
            " " +
            ("0" + today.getHours()).slice(-2) +
            ":" +
            ("0" + today.getMinutes()).slice(-2) +
            ":" +
            ("0" + today.getSeconds()).slice(-2) +
            "|" +
            Math.floor(Math.random() * Math.pow(10, 5))
                .toString()
                .padStart(5, "0")
        );
    }

    // TODO: consider using just the context instead
    log(
        inputVal,
        problemID,
        step,
        hint,
        isCorrect,
        hintsFinished,
        eventType,
        variabilization,
        lesson,
        courseName,
        hintType,
        dynamicHint,
        bioInfo
    ) {
        if (!DO_LOG_DATA) {
            console.debug("Not using firebase for logging (2)");
            return;
        }
        console.debug("trying to log hint: ", hint, "step", step);
        if (Array.isArray(hintsFinished) && Array.isArray(hintsFinished[0])) {
            hintsFinished = hintsFinished.map((step) => step.join(", "));
        }
        const data = {
            eventType: eventType,
            problemID: problemID,
            stepID: step?.id,
            hintID: hint?.id,
            input: inputVal?.toString(),
            correctAnswer: step?.stepAnswer?.toString(),
            isCorrect,
            hintInput: null,
            hintAnswer: null,
            hintIsCorrect: null,
            hintsFinished,
            variabilization,
            lesson,
            Content: courseName,
            knowledgeComponents: step?.knowledgeComponents,
            hintType,
            dynamicHint,
            bioInfo,
        };
        // return this.writeData(GPTExperimentOutput, data);
        return this.writeData(problemSubmissionsOutput, data);
    }

    hintLog(
        hintInput,
        problemID,
        step,
        hint,
        isCorrect,
        hintsFinished,
        variabilization,
        lesson,
        courseName,
        hintType,
        dynamicHint,
        bioInfo
    ) {
        if (!DO_LOG_DATA) return;
        console.debug("step", step);
        const data = {
            eventType: "hintScaffoldLog",
            problemID,
            stepID: step?.id,
            hintID: hint?.id,
            input: null,
            correctAnswer: null,
            isCorrect: null,
            hintInput: hintInput?.toString(),
            hintAnswer: hint?.hintAnswer?.toString(),
            hintIsCorrect: isCorrect,
            hintsFinished,
            variabilization,
            Content: courseName,
            lesson,
            knowledgeComponents: step?.knowledgeComponents,
            hintType,
            dynamicHint,
            bioInfo,
        };
        // return this.writeData(GPTExperimentOutput, data);
        return this.writeData(problemSubmissionsOutput, data);
    }

    mouseLog(payload) {
        if (!DO_LOG_DATA || !DO_LOG_MOUSE_DATA) return;
        if (this.mouseLogBuffer.length > 0) {
            if (
                !(
                    Math.abs(
                        payload.position.x -
                            this.mouseLogBuffer[this.mouseLogBuffer.length - 1]
                                .x
                    ) > GRANULARITY ||
                    Math.abs(
                        payload.position.y -
                            this.mouseLogBuffer[this.mouseLogBuffer.length - 1]
                                .y
                    ) > GRANULARITY
                )
            ) {
                return;
            }
        }
        if (this.mouseLogBuffer.length < MAX_BUFFER_SIZE) {
            this.mouseLogBuffer.push({
                x: payload.position.x,
                y: payload.position.y,
            });
            return;
        }
        const data = {
            eventType: "mouseLog",
            _logBufferSize: MAX_BUFFER_SIZE,
            _logGranularity: GRANULARITY,
            screenSize: payload.elementDimensions,
            mousePos: this.mouseLogBuffer,
        };
        this.mouseLogBuffer = [];
        console.debug("Logged mouseMovement");
        return this.writeData("mouseMovement", data);
    }

    startedProblem(problemID, courseName, lesson, lessonObjectives) {
        if (!DO_LOG_DATA) return;
        console.debug(
            `Logging that the problem has been started (${problemID})`
        );
        const data = {
            problemID,
            Content: courseName,
            lesson,
            lessonObjectives,
        };
        return this.writeData(problemStartLogOutput, data);
    }

    submitSiteLog(logType, logMessage, relevantInformation, problemID = "n/a") {
        const data = {
            logType,
            logMessage,
            relevantInformation,
            problemID,
        };
        
        const collectionName = this.getCollectionName(siteLogOutput);
        if (IS_STAGING_OR_DEVELOPMENT) {
            console.debug(`Submitting site log to collection: ${collectionName}`, data);
        }
        
        return this.writeData(siteLogOutput, data);
    }

    submitFocusChange(_focusStatus) {
        const data = {
            focusStatus: _focusStatus,
        };

        // TODO: oats_user_id is not guaranteed to be unique across users; is this a problem?
        return this.pushDataToArr(
            focusStatus,
            this.oats_user_id,
            "focusHistory",
            data,
            true
        );
    }

    submitFeedback(
        problemID,
        feedback,
        problemFinished,
        variables,
        courseName,
        steps,
        lesson
    ) {
        const data = {
            problemID,
            problemFinished,
            feedback,
            lesson,
            status: "open",
            Content: courseName,
            variables,
            steps: steps.map(
                ({
                    answerType,
                    id,
                    stepAnswer,
                    problemType,
                    knowledgeComponents,
                }) => ({
                    answerType,
                    id,
                    stepAnswer,
                    problemType,
                    knowledgeComponents,
                })
            ),
        };
        return this.writeData(feedbackOutput, data);
    }

    /**
     * Logs a hint request to a separate hintTracking collection
     * Creates a new document for each hint request with user, timestamp, and hint details
     * @param {string} problemID - The problem ID
     * @param {string} stepID - The step ID within the problem
     * @param {string} hintID - Unique identifier for the specific hint
     * @param {string} hintContent - The actual text/content of the hint
     * @param {string} hintTitle - Title of the hint
     * @param {string} hintType - Type of hint ("regular", "dynamic", "scaffold", etc.)
     * @param {number} hintNumber - Sequential number of hint requested (1st, 2nd, 3rd, etc.)
     * @param {string} courseName - Name of the course
     * @param {string} lesson - Lesson identifier
     */
    logHintRequest(
        problemID,
        stepID,
        hintID,
        hintContent,
        hintTitle,
        hintType,
        hintNumber,
        courseName,
        lesson
    ) {
        if (!DO_LOG_DATA) {
            console.debug("Not using firebase for hint tracking");
            return;
        }

        const data = {
            problemID,
            stepID,
            hintID,
            hintContent: hintContent || null,
            hintTitle: hintTitle || null,
            hintType: hintType || "regular",
            hintNumber,
            Content: courseName || "n/a",
            lesson: lesson || "n/a",
        };

        if (IS_STAGING_OR_DEVELOPMENT) {
            console.log("📝 Logging hint request to hintTracking collection:", data);
        }

        return this.writeData(hintTrackingOutput, data).then(() => {
            if (IS_STAGING_OR_DEVELOPMENT) {
                console.log("✅ Hint request successfully written to hintTracking collection");
            }
        }).catch((error) => {
            console.error("❌ Error writing hint request to Firestore:", error);
            throw error;
        });
    }

    /**
     * Logs a keystroke event to track typing patterns and detect potential AI cheating
     * Buffers keystrokes and flushes when buffer is full or on explicit flush
     * @param {string} problemID - The problem ID
     * @param {string} stepID - The step ID within the problem
     * @param {number} currentLength - Current length of input
     * @param {number} previousLength - Previous length of input
     * @param {number} timeSinceLastKeystroke - Time in ms since last keystroke
     * @param {boolean} isPasteEvent - Whether this was a paste event (large text insertion)
     * @param {boolean} shouldFlush - Force flush the buffer (e.g., on submit)
     */
    logKeystroke(
        problemID,
        stepID,
        currentLength,
        previousLength,
        timeSinceLastKeystroke,
        isPasteEvent = false,
        shouldFlush = false
    ) {
        if (!DO_LOG_DATA || !DO_LOG_KEYSTROKES) {
            if (IS_STAGING_OR_DEVELOPMENT) {
                console.debug("Keystroke logging disabled:", {
                    DO_LOG_DATA,
                    DO_LOG_KEYSTROKES
                });
            }
            return;
        }

        const now = Date.now();
        const keystrokeData = {
            timestamp: now,
            inputLength: currentLength,
            previousLength: previousLength,
            lengthChange: currentLength - previousLength,
            timeSinceLastKeystroke: timeSinceLastKeystroke,
            isPasteEvent: isPasteEvent,
        };

        this.keystrokeBuffer.push(keystrokeData);
        this.lastKeystrokeTime = now;
        this.lastInputLength = currentLength;

        if (IS_STAGING_OR_DEVELOPMENT) {
            console.debug(`⌨️ Keystroke buffered (${this.keystrokeBuffer.length}/${KEYSTROKE_BUFFER_SIZE}):`, {
                problemID,
                stepID,
                bufferSize: this.keystrokeBuffer.length,
                isPasteEvent
            });
        }

        // Flush buffer if it's full or if explicitly requested
        if (this.keystrokeBuffer.length >= KEYSTROKE_BUFFER_SIZE || shouldFlush) {
            this.flushKeystrokeBuffer(problemID, stepID);
        } else {
            // Set a timer to flush after 5 seconds of inactivity (so data doesn't get stuck)
            if (this.keystrokeFlushTimer) {
                clearTimeout(this.keystrokeFlushTimer);
            }
            this.keystrokeFlushTimer = setTimeout(() => {
                if (this.keystrokeBuffer.length > 0) {
                    this.flushKeystrokeBuffer(problemID, stepID);
                }
            }, 5000); // Flush after 5 seconds of no new keystrokes
        }
    }

    /**
     * Flushes the keystroke buffer to Firestore
     * @param {string} problemID - The problem ID
     * @param {string} stepID - The step ID
     */
    flushKeystrokeBuffer(problemID, stepID) {
        if (this.keystrokeBuffer.length === 0) {
            if (IS_STAGING_OR_DEVELOPMENT) {
                console.debug("Keystroke buffer is empty, nothing to flush");
            }
            return;
        }

        // Calculate typing metrics
        const keystrokes = [...this.keystrokeBuffer]; // Copy array
        const totalTime = keystrokes.length > 1 
            ? keystrokes[keystrokes.length - 1].timestamp - keystrokes[0].timestamp 
            : 0;
        const totalCharacters = keystrokes.reduce((sum, k) => sum + Math.max(0, k.lengthChange), 0);
        const typingSpeed = totalTime > 0 ? (totalCharacters / totalTime) * 1000 : 0; // characters per second
        
        const pasteEvents = keystrokes.filter(k => k.isPasteEvent).length;
        const averageTimeBetweenKeystrokes = keystrokes.length > 1
            ? keystrokes.slice(1).reduce((sum, k, i) => sum + k.timeSinceLastKeystroke, 0) / (keystrokes.length - 1)
            : 0;

        const data = {
            problemID: problemID || "n/a",
            stepID: stepID || "n/a",
            keystrokeCount: keystrokes.length,
            totalTime: totalTime,
            totalCharacters: totalCharacters,
            typingSpeed: Math.round(typingSpeed * 100) / 100, // Round to 2 decimal places
            pasteEventCount: pasteEvents,
            averageTimeBetweenKeystrokes: Math.round(averageTimeBetweenKeystrokes * 100) / 100,
            keystrokes: keystrokes, // Full keystroke data
        };

        console.log("📤 Flushing keystroke buffer to Firestore:", {
            problemID,
            stepID,
            keystrokeCount: keystrokes.length,
            typingSpeed: data.typingSpeed,
            pasteEvents,
            collection: this.getCollectionName(keystrokeLogOutput)
        });

        // Clear buffer BEFORE writing (in case write fails, we don't want to lose data)
        const bufferToWrite = [...this.keystrokeBuffer];
        this.keystrokeBuffer = [];

        return this.writeData(keystrokeLogOutput, data).then(() => {
            console.log("✅ Keystroke buffer successfully written to Firestore");
        }).catch((error) => {
            console.error("❌ Error writing keystroke buffer:", error);
            // Restore buffer on error so we can retry
            this.keystrokeBuffer = bufferToWrite;
        });
    }
}

export default Firebase;
