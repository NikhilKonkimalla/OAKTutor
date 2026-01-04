import React from "react";
import "./App.css";
import Platform from "./platform-logic/Platform.js";
import DebugPlatform from "./platform-logic/DebugPlatform.js";
import Firebase from "@components/Firebase.js";
import { LocalizationProvider } from "./util/LocalizationContext";
import {
    AB_TEST_MODE
} from "./config/config.js";

import { HashRouter as Router, Route, Switch } from "react-router-dom";
import NotFound from "@components/NotFound.js";

import {
    DO_FOCUS_TRACKING,
    PROGRESS_STORAGE_KEY,
    SITE_VERSION,
    ThemeContext,
    USER_ID_STORAGE_KEY,
} from "./config/config.js";
import {
    createTheme,
    responsiveFontSizes,
    ThemeProvider,
} from "@material-ui/core/styles";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import parseJwt from "./util/parseJWT";
import AssignmentNotLinked from "./pages/AssignmentNotLinked";
import AssignmentAlreadyLinked from "./pages/AssignmentAlreadyLinked";
import SessionExpired from "./pages/SessionExpired";
import { Posts } from "./pages/Posts/Posts";
import AddCourse from "./pages/AddCourse";
import AddProblem from "./pages/AddProblem";
import EditProblem from "./pages/EditProblem";
import loadFirebaseEnvConfig from "./util/loadFirebaseEnvConfig";
import generateRandomInt from "./util/generateRandomInt";
import { cleanObjectKeys } from "./util/cleanObject";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary";
import { IS_STAGING_OR_DEVELOPMENT } from "./util/getBuildType";
import TabFocusTrackerWrapper from "./components/TabFocusTrackerWrapper";
import ViewAllProblems from "./components/problem-layout/ViewAllProblems";

// ### BEGIN CUSTOMIZABLE IMPORTS ###
import config, { analytics } from "./config/firebaseConfig.js";
import { logEvent } from "firebase/analytics";
import skillModel from "./content-sources/oatutor/skillModel.json";
import defaultBKTParams from "./content-sources/oatutor/bkt-params/defaultBKTParams.json";
import experimentalBKTParams from "./content-sources/oatutor/bkt-params/experimentalBKTParams.json";
import { heuristic as defaultHeuristic } from "./models/BKT/problem-select-heuristics/defaultHeuristic.js";
import { heuristic as experimentalHeuristic } from "./models/BKT/problem-select-heuristics/experimentalHeuristic.js";
import BrowserStorage from "./util/browserStorage";
// ### END CUSTOMIZABLE IMPORTS ###

loadFirebaseEnvConfig(config);

let theme = createTheme({
    palette: {
        type: 'light', // This enables dark mode
        primary: {
            main: '#1976d2', // Blue primary color
            light: '#42a5f5',
            dark: '#1565c0',
        },
        secondary: {
            main: '#dc004e', // Pink/purple secondary color
        },
        background: {
            default: '#121212', // Lighter dark background (was #121212)
            paper: '#1e1e1e', // Lighter for cards/papers (was #1e1e1e)
        },
        text: {
            primary: '#ffffff', // White text
            secondary: '#b3b3b3', // Light gray for secondary text
        },
        divider: '#333333', // Dark dividers
    },
    overrides: {
        MuiCard: {
            root: {
                backgroundColor: '#3a3a3a', // Lighter card background
                color: '#ffffff', // White text on cards
            },
        },
        MuiAppBar: {
            root: {
                backgroundColor: '#3a3a3a', // Lighter app bar
                color: '#ffffff',
            },
        },
        MuiButton: {
            contained: {
                backgroundColor: '#4a90e2', // Lighter blue for buttons
                color: '#ffffff',
                '&:hover': {
                    backgroundColor: '#1976d2', // Original blue on hover
                },
            },
            outlined: {
                color: '#4a90e2', // Lighter blue for outlined buttons
                borderColor: '#4a90e2',
                backgroundColor: 'rgba(74, 144, 226, 0.1)', // Light background
                '&:hover': {
                    backgroundColor: 'rgba(74, 144, 226, 0.2)',
                    borderColor: '#1976d2',
                },
            },
        },
        MuiTextField: {
            root: {
                '& .MuiInputBase-root': {
                    color: '#ffffff',
                },
                '& .MuiInputLabel-root': {
                    color: '#b3b3b3',
                },
                '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                        borderColor: '#333333',
                    },
                    '&:hover fieldset': {
                        borderColor: '#1976d2',
                    },
                    '&.Mui-focused fieldset': {
                        borderColor: '#1976d2',
                    },
                },
            },
        },
        MuiPaper: {
            root: {
                backgroundColor: '#3a3a3a',
                color: '#ffffff',
            },
        },
    },
});
theme = responsiveFontSizes(theme);

const queryParamToContext = {
    token: "jwt",
    lis_person_name_full: "studentName",
    to: "alreadyLinkedLesson",
    use_expanded_view: "use_expanded_view",
    do_not_restore: "noRestore",
    locale: "locale",
};

const queryParamsToKeep = ["use_expanded_view", "to", "do_not_restore", "locale"];

let treatmentMapping;

if (!AB_TEST_MODE) {
    treatmentMapping = {
        bktParams: cleanObjectKeys(defaultBKTParams),
        heuristic: defaultHeuristic,
        hintPathway: "DefaultPathway"
    };
} else {
    treatmentMapping = {
        bktParams: { 0: cleanObjectKeys(defaultBKTParams), 1: cleanObjectKeys(experimentalBKTParams) },
        heuristic: { 0: defaultHeuristic, 1: experimentalHeuristic },
        hintPathway: { 0: "DefaultPathway", 1: "DefaultPathway" }
    };
}

class App extends React.Component {
    constructor(props) {
        super(props);
        // UserID creation/loading
        let userId = localStorage.getItem(USER_ID_STORAGE_KEY);
        if (!userId) {
            userId = generateRandomInt().toString();
            localStorage.setItem(USER_ID_STORAGE_KEY, userId);
        }
        this.userID = userId;
        this.bktParams = this.getTreatmentObject(treatmentMapping.bktParams);

        this.originalBktParams = JSON.parse(
            JSON.stringify(this.getTreatmentObject(treatmentMapping.bktParams))
        );

        this.state = {
            additionalContext: {},
        };

        if (IS_STAGING_OR_DEVELOPMENT) {
            document["oats-meta-site-hash"] = process.env.REACT_APP_COMMIT_HASH;
            document["oats-meta-site-updatetime"] =
                process.env.REACT_APP_BUILD_TIMESTAMP;
        }

        const onLocationChange = () => {
            const additionalContext = {};
            const search =
                window.location.search ||
                window.location.hash.substr(
                    window.location.hash.indexOf("?") + 1
                );
            const sp = new URLSearchParams(search);

            Object.keys(queryParamToContext).forEach((qp) => {
                const ctxKey = queryParamToContext[qp];
                const ctxValue = sp.get(qp);
                if (ctxValue !== null) {
                    additionalContext[ctxKey] = ctxValue;
                }
            });

            if (additionalContext?.jwt) {
                try {
                    const user = parseJwt(additionalContext.jwt);
                    additionalContext["user"] = user;
                    additionalContext["studentName"] = user?.full_name || "";
                } catch (jwtError) {
                    console.error("Failed to parse JWT:", jwtError);
                    // Continue without user context if JWT parsing fails
                }
            }

            // Firebase creation with error handling
            try {
                this.firebase = new Firebase(
                    this.userID,
                    config,
                    this.getTreatment(),
                    SITE_VERSION,
                    additionalContext.user
                );
                
                // Verify Firebase is properly initialized
                if (this.firebase && this.firebase.db && this.firebase.submitSiteLog) {
                    console.log("✅ Firebase initialized successfully, attempting to log site visit...");
                    
                    // Log site visit to Firestore
                    this.firebase.submitSiteLog(
                        "site-visit",
                        "User visited the webapp",
                        {
                            url: window.location.href,
                            path: window.location.pathname,
                            userAgent: navigator.userAgent,
                            screenWidth: window.screen.width,
                            screenHeight: window.screen.height,
                            viewportWidth: window.innerWidth,
                            viewportHeight: window.innerHeight,
                        }
                    ).then(() => {
                        console.log("✅ Site visit logged to Firestore successfully!");
                    }).catch((logError) => {
                        console.error("❌ Failed to log site visit to Firestore:", logError);
                        console.error("Error details:", {
                            code: logError?.code,
                            message: logError?.message
                        });
                    });
                    
                    // Also log to Firebase Analytics for active user tracking
                    if (analytics) {
                        try {
                            logEvent(analytics, 'page_view', {
                                page_path: window.location.pathname,
                                page_title: document.title
                            });
                            logEvent(analytics, 'site_visit', {
                                user_id: this.userID
                            });
                            console.log("✅ Site visit logged to Analytics successfully!");
                        } catch (analyticsError) {
                            console.warn("⚠️ Failed to log to Analytics:", analyticsError);
                        }
                    }
                } else {
                    console.error("❌ Firebase initialized but methods not available:", {
                        hasFirebase: !!this.firebase,
                        hasDb: !!(this.firebase && this.firebase.db),
                        hasSubmitSiteLog: !!(this.firebase && this.firebase.submitSiteLog),
                        firebaseType: typeof this.firebase,
                        firebaseKeys: this.firebase ? Object.keys(this.firebase) : []
                    });
                }
            } catch (firebaseError) {
                console.error("Failed to initialize Firebase:", firebaseError);
                console.error("Firebase config:", {
                    projectId: config?.projectId,
                    authDomain: config?.authDomain,
                    hasApiKey: !!config?.apiKey
                });
                // Set firebase to null if initialization fails
                this.firebase = null;
            }

            let targetLocation = window.location.href.split("?")[0];

            const contextToKeep = queryParamsToKeep.map(
                (qp) => queryParamToContext[qp] || qp
            );
            const contextToParam = Object.fromEntries(
                Object.entries(queryParamToContext).map(([key, val]) => [
                    val,
                    key,
                ])
            );
            const keptQueryParamsObj = Object.fromEntries(
                Object.entries(additionalContext)
                    .filter(([key, _]) => contextToKeep.includes(key))
                    .map(([key, val]) => [contextToParam[key] || key, val])
            );
            const keptQueryParams = new URLSearchParams(keptQueryParamsObj);

            if (Object.keys(keptQueryParamsObj).length > 0) {
                targetLocation += `?${keptQueryParams.toString()}`;
            }

            if (this.mounted) {
                this.setState((prev) => ({
                    additionalContext: {
                        ...prev.additionalContext,
                        ...additionalContext,
                    },
                }));
                window.history.replaceState({}, document.title, targetLocation);
            } else if (this.mounted === undefined) {
                this.state = {
                    ...this.state,
                    additionalContext,
                };
                window.history.replaceState({}, document.title, targetLocation);
            }
        };
        window.addEventListener("popstate", onLocationChange);
        onLocationChange();

        this.browserStorage = new BrowserStorage(this);

        this.saveProgress = this.saveProgress.bind(this);
    }

    componentDidMount() {
        this.mounted = true;
        
        // Expose Firebase instance to window for debugging (development only)
        if (IS_STAGING_OR_DEVELOPMENT && this.firebase) {
            window.firebaseDebug = {
                firebase: this.firebase,
                testLog: () => {
                    if (this.firebase && this.firebase.submitSiteLog) {
                        console.log("🧪 Testing Firebase log...");
                        return this.firebase.submitSiteLog("test", "Manual test log", {test: true})
                            .then(() => console.log("✅ Test log successful!"))
                            .catch(err => console.error("❌ Test log failed:", err));
                    } else {
                        console.error("❌ Firebase not available for testing");
                    }
                }
            };
            console.log("🔧 Firebase debug tools available. Use window.firebaseDebug.testLog() to test logging.");
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    getTreatment = () => {
        return this.userID % 2;
    };

    getTreatmentObject = (targetObject) => {
        if (!AB_TEST_MODE) {
            return targetObject;
        }
        return targetObject[this.getTreatment()];
    };

    removeProgress = async () => {
        const { getKeys, removeByKey } = this.browserStorage;
        await removeByKey(PROGRESS_STORAGE_KEY);
        const existingKeys = (await getKeys()) || [];
        const lessonStorageKeys = existingKeys.filter((key) =>
            key.startsWith(PROGRESS_STORAGE_KEY)
        );
        await Promise.allSettled(
            lessonStorageKeys.map(async (key) => await removeByKey(key))
        );
        this.bktParams = this.getTreatmentObject(treatmentMapping.bktParams);
        window.location.reload();
    };

    saveProgress = () => {
        console.debug("saving progress");

        const progressedBktParams = Object.fromEntries(
            // only add to db if it is not the same as originally provided bkt params
            Object.entries(this.bktParams || {}).filter(([key, val]) => {
                // console.debug(this.originalBktParams[key]?.probMastery, 'vs.', val.probMastery)
                return (
                    this.originalBktParams[key]?.probMastery !== val.probMastery
                );
            })
        );
        const { setByKey } = this.browserStorage;
        setByKey(PROGRESS_STORAGE_KEY, progressedBktParams, (err) => {
            if (err) {
                console.debug("save progress error: ", err);
                toast.warn("Unable to save mastery progress :(", {
                    toastId: "unable_to_save_progress",
                });
            } else {
                console.debug("saved progress successfully");
            }
        }).then((_) => {});
    };

    loadBktProgress = async () => {
        const { getByKey } = this.browserStorage;
        const progress = await getByKey(PROGRESS_STORAGE_KEY).catch((_e) => {
            console.debug("error with getting previous progress", _e);
        });
        if (
            progress == null ||
            typeof progress !== "object" ||
            Object.keys(progress).length === 0
        ) {
            console.debug(
                "resetting progress... obtained progress was invalid: ",
                progress
            );
            this.bktParams = this.getTreatmentObject(
                treatmentMapping.bktParams
            );
        } else {
            console.debug(
                "restoring progress from before (raw, uncleaned): ",
                progress
            );
            Object.assign(this.bktParams, cleanObjectKeys(progress));
        }
    };

    render() {
        return (
            <ThemeProvider theme={theme}>
                <ThemeContext.Provider
                    value={{
                        userID: this.userID,
                        firebase: this.firebase,
                        getTreatment: this.getTreatment,
                        bktParams: this.bktParams,
                        heuristic: this.getTreatmentObject(
                            treatmentMapping.heuristic
                        ),
                        hintPathway: this.getTreatmentObject(
                            treatmentMapping.hintPathway
                        ),
                        skillModel,
                        credentials: config,
                        debug: false,
                        studentName: "",
                        alreadyLinkedLesson: "",
                        jwt: "",
                        user: {},
                        problemID: "n/a",
                        problemIDs: null,
                        ...this.state.additionalContext,
                        browserStorage: this.browserStorage,
                    }}
                >
                <LocalizationProvider>
                    <GlobalErrorBoundary>
                        <Router>
                            <div className="Router">
                                <Switch>
                                    <Route
                                        exact
                                        path="/"
                                        render={(props) => (
                                            <Platform
                                                key={Date.now()}
                                                saveProgress={() =>
                                                    this.saveProgress()
                                                }
                                                loadBktProgress={
                                                    this.loadBktProgress
                                                }
                                                removeProgress={
                                                    this.removeProgress
                                                }
                                                {...props}
                                            />
                                        )}
                                    />
                                    <Route
                                        path="/courses/:courseNum"
                                        render={(props) => (
                                            <Platform
                                                key={Date.now()}
                                                saveProgress={() =>
                                                    this.saveProgress()
                                                }
                                                loadBktProgress={
                                                    this.loadBktProgress
                                                }
                                                removeProgress={
                                                    this.removeProgress
                                                }
                                                courseNum={
                                                    props.match.params.courseNum
                                                }
                                                {...props}
                                            />
                                        )}
                                    />
                                    <Route
                                      exact
                                      path="/lessons/:lessonID/problems"
                                        component={ViewAllProblems}
                                       />
                                    <Route
                                    exact
                                        path="/lessons/:lessonID"
                                        render={(props) => (
                                            <Platform
                                                key={Date.now()}
                                                saveProgress={() =>
                                                    this.saveProgress()
                                                }
                                                loadBktProgress={
                                                    this.loadBktProgress
                                                }
                                                removeProgress={
                                                    this.removeProgress
                                                }
                                                lessonID={
                                                    props.match.params.lessonID
                                                }
                                                {...props}
                                            />
                                        )}
                                    />
                                    <Route
                                        path="/debug/:problemID"
                                        render={(props) => (
                                            <DebugPlatform
                                                key={Date.now()}
                                                saveProgress={() =>
                                                    this.saveProgress()
                                                }
                                                loadBktProgress={
                                                    this.loadBktProgress
                                                }
                                                removeProgress={
                                                    this.removeProgress
                                                }
                                                problemID={
                                                    props.match.params.problemID
                                                }
                                                {...props}
                                            />
                                        )}
                                    />
                                    <Route
                                        path="/posts"
                                        render={(props) => (
                                            <Posts
                                                key={Date.now()}
                                                {...props}
                                            />
                                        )}
                                    />
                                    <Route
                                        exact
                                        path="/assignment-not-linked"
                                        render={(props) => (
                                            <AssignmentNotLinked
                                                key={Date.now()}
                                                {...props}
                                            />
                                        )}
                                    />
                                    <Route
                                        exact
                                        path="/assignment-already-linked"
                                        render={(props) => (
                                            <AssignmentAlreadyLinked
                                                key={Date.now()}
                                                {...props}
                                            />
                                        )}
                                    />
                                    <Route
                                        exact
                                        path="/session-expired"
                                        render={(props) => (
                                            <SessionExpired
                                                key={Date.now()}
                                                {...props}
                                            />
                                        )}
                                    />
                                    <Route
                                        exact
                                        path="/add-course"
                                        render={(props) => (
                                            <AddCourse
                                                key={Date.now()}
                                                {...props}
                                            />
                                        )}
                                    />
                                    <Route
                                        exact
                                        path="/lessons/:lessonID/add-problem"
                                        render={(props) => (
                                            <AddProblem
                                                key={Date.now()}
                                                {...props}
                                            />
                                        )}
                                    />
                                    <Route
                                        exact
                                        path="/lessons/:lessonID/edit-problem/:problemID"
                                        render={(props) => (
                                            <EditProblem
                                                key={Date.now()}
                                                {...props}
                                            />
                                        )}
                                    />
                                    <Route component={NotFound} />
                                </Switch>
                            </div>
                            {DO_FOCUS_TRACKING && <TabFocusTrackerWrapper />}
                        </Router>
                        <ToastContainer
                            autoClose={false}
                            closeOnClick={false}
                        />
                    </GlobalErrorBoundary>
                    </LocalizationProvider>
                </ThemeContext.Provider>
            </ThemeProvider>
        );
    }
}

export default App;
