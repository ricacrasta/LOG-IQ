const failurePatterns = [
    {
        name: "Invalid Node.js Version",
        keywords: [
            "Unable to find Node version",
            "node version",
            "Node.js version"
        ],
        category: "Environment",
        severity: "High",
        confidence: 0.98,
        analysis:
            "The GitHub Actions workflow is requesting a Node.js version that is not available on the runner.",
        recommendation:
            "Change the workflow to use a supported Node.js version such as 18, 20, or 22.",
        possibleCauses: [
            "Invalid Node.js version specified in the workflow",
            "Requested Node.js version is unavailable on the runner",
            "Incorrect setup-node configuration"
        ]
    },

    {
        name: "NPM Installation Error",
        keywords: [
            "npm ERR!",
            "npm install",
            "npm ci",
            "ERESOLVE"
        ],
        category: "Dependency",
        severity: "High",
        confidence: 0.94,
        analysis:
            "The workflow encountered a problem while installing Node.js dependencies.",
        recommendation:
            "Check package.json and package-lock.json for incompatible or missing dependencies.",
        possibleCauses: [
            "Dependency version conflict",
            "Invalid package configuration",
            "Package installation failure"
        ]
    },

    {
        name: "Module Not Found",
        keywords: [
            "MODULE_NOT_FOUND",
            "Cannot find module",
            "Module not found"
        ],
        category: "Application",
        severity: "High",
        confidence: 0.97,
        analysis:
            "The application attempted to import or require a module that could not be found.",
        recommendation:
            "Verify that the required package exists in package.json and that the import path is correct.",
        possibleCauses: [
            "Missing dependency",
            "Incorrect import path",
            "Dependency was not installed"
        ]
    },

    {
        name: "Syntax Error",
        keywords: [
            "SyntaxError",
            "Unexpected token",
            "Unexpected identifier"
        ],
        category: "Application",
        severity: "High",
        confidence: 0.96,
        analysis:
            "The application contains JavaScript syntax that Node.js cannot parse.",
        recommendation:
            "Check the file and line number reported in the error and correct the syntax.",
        possibleCauses: [
            "Invalid JavaScript syntax",
            "Missing bracket or parenthesis",
            "Incorrect statement"
        ]
    },

    {
        name: "Permission Error",
        keywords: [
            "EACCES",
            "permission denied",
            "Permission denied"
        ],
        category: "Permissions",
        severity: "Medium",
        confidence: 0.93,
        analysis:
            "The workflow attempted to access a file, directory, or resource without sufficient permissions.",
        recommendation:
            "Check file permissions and GitHub Actions permissions for the affected resource.",
        possibleCauses: [
            "Insufficient file permissions",
            "Missing GitHub Actions permissions",
            "Protected resource"
        ]
    }
];


// Extract application source-code location from logs
function extractLocation(logText) {

    // Example:
    // at app.js:42:15
    // at src/server.js:18:7
    const locationRegex =
        /at\s+(?:.*?\()?(?!node:internal)(?:.*[\\/])?([A-Za-z0-9_.-]+\.(?:js|mjs|cjs|ts|tsx|jsx)):(\d+):(\d+)/;

    const locationMatch = logText.match(locationRegex);

    if (locationMatch) {
        return {
            affectedFile: locationMatch[1],
            line: Number(locationMatch[2]),
            column: Number(locationMatch[3])
        };
    }


    // Look for a file path in "Cannot find module"
    // Example:
    // Cannot find module '/home/runner/.../hello.js'
    const moduleMatch = logText.match(
        /Cannot find module ['"]([^'"]+)['"]/i
    );

    if (moduleMatch) {

        const fullPath = moduleMatch[1];

        // Extract only the filename
        const fileName = fullPath.split(/[\\/]/).pop();

        return {
            affectedFile: fileName,
            line: null,
            column: null
        };
    }


    // Look for files in a Require stack
    // Example:
    // - /home/runner/.../index.js
    const requireStackMatch = logText.match(
        /Require stack:\s*[\r\n]+\s*-\s+.*[\\/]([^\\/]+\.js)/i
    );

    if (requireStackMatch) {
        return {
            affectedFile: requireStackMatch[1],
            line: null,
            column: null
        };
    }


    // No application location found
    return {
        affectedFile: null,
        line: null,
        column: null
    };
}


function analyzeLogs(logText) {

    if (!logText || typeof logText !== "string") {
        return {
            category: "Unknown Workflow Failure",
            severity: "Unknown",
            error: "No log data available",
            confidence: 0,
            analysis:
                "The AI service could not analyze the workflow because no logs were provided.",
            recommendation:
                "Check whether the GitHub Actions logs were downloaded correctly.",
            possibleCauses: [
                "Logs were unavailable",
                "Log extraction failed",
                "Workflow run does not contain readable logs"
            ],
            affectedFile: null,
            line: null,
            column: null
        };
    }


    const lowerLog = logText.toLowerCase();

    // Extract location from the real logs
    const location = extractLocation(logText);


    // Match the existing failure patterns
    for (const pattern of failurePatterns) {

        const matchedKeyword = pattern.keywords.find(keyword =>
            lowerLog.includes(keyword.toLowerCase())
        );

        if (matchedKeyword) {

            return {
                category: pattern.name,
                severity: pattern.severity,
                error: matchedKeyword,
                confidence: pattern.confidence,
                analysis: pattern.analysis,
                recommendation: pattern.recommendation,
                possibleCauses: pattern.possibleCauses,

                // Location-aware information
                affectedFile: location.affectedFile,
                line: location.line,
                column: location.column
            };
        }
    }


    // Unknown failure
    return {
        category: "Unknown Workflow Failure",
        severity: "Medium",
        error: "No known failure pattern detected",
        confidence: 0.40,
        analysis:
            "The workflow failed, but the AI service could not match the extracted logs to a known failure pattern.",
        recommendation:
            "Inspect the extracted error messages and workflow configuration for additional context.",
        possibleCauses: [
            "New or unsupported failure type",
            "Insufficient log context",
            "Failure pattern not present in the knowledge base"
        ],

        // Location-aware information
        affectedFile: location.affectedFile,
        line: location.line,
        column: location.column
    };
}


module.exports = {
    analyzeLogs
};