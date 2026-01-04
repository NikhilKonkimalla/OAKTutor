import React from 'react';
import { ThemeContext } from "../config/config";

export default class ErrorBoundary extends React.Component {
    static contextType = ThemeContext;

    constructor(props, context) {
        super(props);
        this.state = { hasError: false };
        this.context = context
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        const { componentName = "_default_" } = this.props;
        
        // Log error to console for debugging
        console.error("ErrorBoundary caught an error:", {
            componentName,
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
            errorInfo
        });

        // Safely attempt to log to Firebase
        try {
            if (this.context && this.context.firebase && typeof this.context.firebase.submitSiteLog === 'function') {
                this.context.firebase.submitSiteLog("site-error", `componentName: ${componentName}`, {
                    errorName: error.name || "n/a",
                    errorCode: error.code || "n/a",
                    errorMsg: error.message || "n/a",
                    errorStack: error.stack || "n/a",
                    errorInfo
                }, this.context.problemID || "n/a").catch((logError) => {
                    console.error("Failed to log error to Firebase:", logError);
                });
            } else {
                console.warn("Firebase not available for error logging. Context:", {
                    hasContext: !!this.context,
                    hasFirebase: !!(this.context && this.context.firebase),
                    hasSubmitSiteLog: !!(this.context && this.context.firebase && typeof this.context.firebase.submitSiteLog === 'function')
                });
            }
        } catch (logError) {
            console.error("Error while attempting to log error:", logError);
        }
    }

    render() {
        const { replacement } = this.props
        if (this.state.hasError) {
            return <>
                <div style={{
                    textAlign: "center",
                    display: this.props.inline ? "inline" : "block"
                }}>
                    {replacement
                        ? replacement
                        : <i>This {this.props.descriptor || "component"} could not be loaded</i>
                    }
                </div>
            </>
        }

        return this.props.children;
    }
}
