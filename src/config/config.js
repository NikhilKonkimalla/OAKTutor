import React from "react";
import courses from "../content-sources/oatutor/coursePlans.json";
import { calculateSemester } from "../util/calculateSemester.js";
import { SITE_NAME } from "@common/global-config";
import { cleanObjectKeys } from "../util/cleanObject";

// Load custom courses from localStorage
const getCustomCourses = () => {
    try {
        // Check if we're in a browser environment
        if (typeof window !== 'undefined' && window.localStorage) {
            const customCourses = localStorage.getItem('customCourses');
            return customCourses ? JSON.parse(customCourses) : [];
        }
        return [];
    } catch (error) {
        console.warn('Error loading custom courses:', error);
        return [];
    }
};

// Function to get all courses (default + custom)
const getAllCourses = () => {
    const customCourses = getCustomCourses();
    return [...courses, ...customCourses];
};

// Initial load
const allCourses = getAllCourses();

// Debug logging
console.log('Total courses loaded:', allCourses.length);
console.log('Custom courses:', getCustomCourses().length);

const ThemeContext = React.createContext(0);
const SITE_VERSION = "1.6";

const CURRENT_SEMESTER = calculateSemester(Date.now());

/**
 * If user does not access the website through Canvas, show a warning (for the first time).
 * @type {boolean}
 */
const SHOW_NOT_CANVAS_WARNING = false;

/**
 * Indicates whether the copyright disclaimer should be shown in the footer of the website.
 * @type {boolean}
 */
const SHOW_COPYRIGHT = false;

/**
 * Only set to true if firebaseConfig.js is set, and you wish to use Firebase to store events. Events include user
 * feedback, user interactions, and site logs.
 * @type {boolean}
 */
const ENABLE_FIREBASE = true;

/**
 * If ENABLE_FIREBASE, indicates whether the site should use Firebase to store, process, and analyze general user
 * interactions.
 * @type {boolean}
 */
const DO_LOG_DATA = true;

/**
 * Indicates whether a log event should be fired everytime a user leaves or returns to this window.
 * @type {boolean}
 */
const DO_FOCUS_TRACKING = true;

/**
 * If DO_LOG_DATA is enabled, indicates whether the site should also track user mouse interactions with the site. See
 * the README.md to properly enable this feature.
 * @type {boolean}
 */
const DO_LOG_MOUSE_DATA = false;

/**
 * If DO_LOG_DATA is enabled, indicates whether the site should track user keystrokes to detect typing patterns
 * and potential AI cheating (copy-paste, rapid typing, etc.).
 * @type {boolean}
 */
const DO_LOG_KEYSTROKES = true;

/**
 * Buffer size for keystroke logging before flushing to Firebase
 * @type {number}
 */
const KEYSTROKE_BUFFER_SIZE = 20; // Reduced from 50 to flush more frequently

/**
 * Flag to enable or disable A/B testing
 * @type {boolean}
 */
const AB_TEST_MODE = false;

/**
 * If reach bottom of provided hints, give correct answer to question
 * @type {boolean}
 */
const ENABLE_BOTTOM_OUT_HINTS = true;

// DynamicText not supported for HTML body types
const dynamicText = {
    "%CAR%": "Tesla car",
};

const _SHORT_SITE_NAME = SITE_NAME.toLowerCase()
    .replace(/[^a-z]/g, "")
    .substr(0, 16);

const USER_ID_STORAGE_KEY = `${_SHORT_SITE_NAME}-user_id`;
const PROGRESS_STORAGE_KEY = `${_SHORT_SITE_NAME}-progress`;
export const LESSON_PROGRESS_STORAGE_KEY = (lessonId) =>
    `${PROGRESS_STORAGE_KEY}-${lessonId}`;

const CANVAS_WARNING_STORAGE_KEY = `${_SHORT_SITE_NAME}-canvas-warning-dismissed`;

// Firebase Config
const MAX_BUFFER_SIZE = 100;
const GRANULARITY = 5;

const EQUATION_EDITOR_AUTO_COMMANDS =
    "pi theta sqrt sum prod int alpha beta gamma rho nthroot pm";
const EQUATION_EDITOR_AUTO_OPERATORS = "sin cos tan";

const MIDDLEWARE_URL =
    "https://di2iygvxtg.execute-api.us-west-1.amazonaws.com/prod";

const HELP_DOCUMENT =
    "https://docs.google.com/document/d/e/2PACX-1vToe2F3RiCx1nwcX9PEkMiBA2bFy9lQRaeWIbyqlc8W_KJ9q-hAMv34QaO_AdEelVY7zjFAF1uOP4pG/pub";

const DYNAMIC_HINT_URL = process.env.AI_HINT_GENERATION_AWS_ENDPOINT;

const DYNAMIC_HINT_TEMPLATE =
    "<{problem_title}.> <{problem_subtitle}.> <{question_title}.> <{question_subtitle}.> <Student's answer is: {student_answer}.> <The correct answer is: {correct_answer}.> Please give a hint for this.";

// OpenRouter API Configuration
const OPENROUTER_API_KEY = "Bearer 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";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const MASTERY_THRESHOLD = 0.95;

// Function to get course plans dynamically
const getCoursePlans = () => {
    return getAllCourses();
};

// Function to get lesson plans dynamically
const getLessonPlans = () => {
    const coursePlans = getCoursePlans();
    const lessonPlans = [];
    
    for (let i = 0; i < coursePlans.length; i++) {
        const course = coursePlans[i];
        if (course.lessons) {
            for (let j = 0; j < course.lessons.length; j++) {
                course.lessons[j].learningObjectives = cleanObjectKeys(
                    course.lessons[j].learningObjectives
                );
                lessonPlans.push({
                    ...course.lessons[j],
                    courseName: course.courseName,
                    courseOER: course.courseOER != null ? course.courseOER : "",
                    courseLicense:
                        course.courseLicense != null ? course.courseLicense : "",
                });
            }
        }
    }
    
    return lessonPlans.filter(
        ({ courseName }) => !courseName.startsWith("!!")
    );
};

// Initial values
const coursePlans = getCoursePlans();
const _coursePlansNoEditor = coursePlans.filter(({ editor }) => !!!editor);
const _lessonPlansNoEditor = getLessonPlans();

const getCustomProblems = () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const customProblems = localStorage.getItem('customProblems');
            return customProblems ? JSON.parse(customProblems) : [];
        }
        return [];
    } catch (error) {
        console.warn('Error loading custom problems:', error);
        return [];
    }
};

const findLessonById = (ID) => {
    console.log('Looking for lesson ID:', ID);
    const lessonPlans = getLessonPlans();
    console.log('Total lesson plans:', lessonPlans.length);
    console.log('Available lesson IDs:', lessonPlans.map(l => l.id));
    console.log('All lesson plans:', lessonPlans);
    const found = lessonPlans.find((lessonPlan) => lessonPlan.id === ID);
    console.log('Found lesson:', found);
    return found;
};

export {
    ThemeContext,
    SITE_VERSION,
    ENABLE_FIREBASE,
    DO_LOG_DATA,
    DO_LOG_MOUSE_DATA,
    DO_LOG_KEYSTROKES,
    KEYSTROKE_BUFFER_SIZE,
    AB_TEST_MODE,
    dynamicText,
    ENABLE_BOTTOM_OUT_HINTS,
    coursePlans,
    _lessonPlansNoEditor,
    _coursePlansNoEditor,
    getCoursePlans,
    getCustomProblems,
    MAX_BUFFER_SIZE,
    GRANULARITY,
    EQUATION_EDITOR_AUTO_COMMANDS,
    EQUATION_EDITOR_AUTO_OPERATORS,
    MIDDLEWARE_URL,
    DYNAMIC_HINT_URL,
    DYNAMIC_HINT_TEMPLATE,
    MASTERY_THRESHOLD,
    USER_ID_STORAGE_KEY,
    PROGRESS_STORAGE_KEY,
    SITE_NAME,
    HELP_DOCUMENT,
    SHOW_COPYRIGHT,
    CURRENT_SEMESTER,
    CANVAS_WARNING_STORAGE_KEY,
    DO_FOCUS_TRACKING,
    findLessonById,
    SHOW_NOT_CANVAS_WARNING,
    OPENROUTER_API_KEY,
    OPENROUTER_API_URL,
};
