import React from 'react';
import { ThemeContext } from "../config/config";
import ErrorBoundary from "./ErrorBoundary";

export default class GlobalErrorBoundary extends ErrorBoundary {
    static contextType = ThemeContext;

    constructor(props, context) {
        super(props, context);
        this.componentName = "_global_"
    }

    render() {
        if (this.state.hasError) {
            return <>
                <div style={{
                    textAlign: "center",
                    paddingTop: "10vh",
                    minHeight: "100vh",
                    backgroundColor: "#9BB5CE", // Light blue/periwinkle background
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#ffffff" // White text
                }}>
                    <h1 style={{
                        color: "#ffffff",
                        fontSize: "2.5rem",
                        fontWeight: "bold",
                        marginBottom: "1rem"
                    }}>Something went wrong</h1>
                    <p style={{
                        fontSize: "150%",
                        color: "#ffffff",
                        margin: "0 auto",
                        maxWidth: "600px",
                        padding: "0 20px"
                    }}>This incident has been reported to the developer team. Please try again later.</p>
                </div>
            </>
        }

        return this.props.children;
    }
}
