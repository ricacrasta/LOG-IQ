require("dotenv").config();

const express = require("express");

const axios = require("axios");

const AdmZip = require("adm-zip");

const { analyzeLogs } = require("./services/aiServer");

const app = express();

const PORT = 3000;

app.get("/logs", (req, res) => {
    res.json({
        status: "success",
        logs: "Cannot find module express",
        severity: "Medium"
    });
});
app.get("/hello", (req, res) => {
    res.json({
        message: "Hello from my backend!"
    });
});

app.get("/health", (req, res) => {
    res.json({
        message: "This is the health section"
    });
});

app.get("/github", async (req, res) => {
    try {
       const response = await axios.get(
    "https://api.github.com/repos/pristine-1712/ai-log-analyzer/actions/runs",
    {
        headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json"
        }
    }
);

        const lastFiveRuns = response.data.workflow_runs
            .slice(0, 5)
            .map(run => ({
                workflow: run.name,
                status: run.status,
                result: run.conclusion,
                branch: run.head_branch
            }));

        res.json(lastFiveRuns);

    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch data from GitHub"
        });
    }
});

app.get("/failed-builds", async (req, res) => {
    try {
        const response = await axios.get(
    "https://api.github.com/repos/pristine-1712/ai-log-analyzer/actions/runs",
    {
        headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json"
        }
    }
);

        
        const failedRuns = response.data.workflow_runs
    .filter(run => run.conclusion === "failure")
    .slice(0, 5)
    .map(run => ({
        id:run.id,
        workflow: run.name,
        status: run.status,
        result: run.conclusion,
        branch: run.head_branch
    }));

res.json(failedRuns);
    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch data from GitHub"
        });
    }
});

app.get("/failed-builds/:id", async (req, res) => {
    try {

        const runId = req.params.id;

        const response = await axios.get(
            `https://api.github.com/repos/pristine-1712/ai-log-analyzer/actions/runs/${runId}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                    Accept: "application/vnd.github+json"
                }
            }
        );

        res.json({
                id: response.data.id,
                workflow: response.data.name,
                status: response.data.status,
                result: response.data.conclusion,
                logs: response.data.logs_url
            });

    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch workflow details"
        });
    }
});

app.get("/logs/:id", async (req, res) => {
    try {

        const runId = req.params.id;


        const response = await axios.get(
            `https://api.github.com/repos/pristine-1712/ai-log-analyzer/actions/runs/${runId}/logs`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                    Accept: "application/vnd.github+json"
                },
                responseType: "arraybuffer"
            }
        );


        const zip = new AdmZip(response.data);


        const zipEntries = zip.getEntries();

        let logs = "";

            zipEntries.forEach(entry => {

            logs += entry.getData().toString("utf8") + "\n";

            });


const cleanedLogs = logs
    .split("\n")
    .filter(line => line.trim() !== "")
    .filter(line =>
        !line.includes("Current runner version") &&
        !line.includes("Operating System") &&
        !line.includes("Runner Image") &&
        !line.includes("Runner Image Provisioner") &&
        !line.includes("Prepare workflow directory") &&
        !line.includes("Prepare all required actions") &&
        !line.includes("Download action repository") &&
        !line.includes("Complete job name")
    );
    const errorKeywords = [
    "error",
    "failed",
    "exception",
    "exit code",
    "npm ERR!",
    "cannot find"
];

const importantLogs = [];

cleanedLogs.forEach((line, index) => {

    const isError = errorKeywords.some(keyword =>
        line.toLowerCase().includes(keyword.toLowerCase())
    );

    if (isError) {

        const start = Math.max(0, index - 3);
        const end = Math.min(cleanedLogs.length, index + 4);

        importantLogs.push(
            ...cleanedLogs.slice(start, end)
        );
    }

});


res.json({
    id: runId,
    totalLines: cleanedLogs.length,
    errorLines: importantLogs.length,
    preview: importantLogs
});


    } catch(error) {

        res.status(500).json({
            error: "Failed to fetch workflow logs"
        });

    }
});

app.get("/metrics", async (req, res) => {
    try {

        const response = await axios.get(
            "https://api.github.com/repos/pristine-1712/ai-log-analyzer/actions/runs",
            {
                headers: {
                    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                    Accept: "application/vnd.github+json"
                }
            }
        );

        const runs = response.data.workflow_runs;

        const totalBuilds = runs.length;

        const failedBuilds = runs.filter(
            run => run.conclusion === "failure"
        ).length;

        const successfulBuilds = runs.filter(
            run => run.conclusion === "success"
        ).length;


        const successRate =
            ((successfulBuilds / totalBuilds) * 100).toFixed(2);


        res.json({
            totalBuilds: totalBuilds,
            successfulBuilds: successfulBuilds,
            failedBuilds: failedBuilds,
            successRate: successRate + "%"
        });


    } catch (error) {
        res.status(500).json({
            error: "Failed to calculate metrics"
        });
    }
});

app.get("/health-status", async (req, res) => {
    try {

        const response = await axios.get(
            "https://api.github.com/repos/pristine-1712/ai-log-analyzer/actions/runs",
            {
                headers: {
                    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                    Accept: "application/vnd.github+json"
                }
            }
        );


        const latestRun = response.data.workflow_runs[0];


        res.json({
            workflow: latestRun.name,
            branch: latestRun.head_branch,
            status: latestRun.status,
            result: latestRun.conclusion
        });


    } catch(error) {

        res.status(500).json({
            error:"Failed to fetch deployment health"
        });

    }
});

app.get("/risk-analysis", async (req, res) => {
    try {

        const response = await axios.get(
            "https://api.github.com/repos/pristine-1712/ai-log-analyzer/actions/runs",
            {
                headers: {
                    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                    Accept: "application/vnd.github+json"
                }
            }
        );


        const runs = response.data.workflow_runs;


        const failedBuilds = runs.filter(
            run => run.conclusion === "failure"
        ).length;


        const successfulBuilds = runs.filter(
            run => run.conclusion === "success"
        ).length;


        let riskLevel;


        if (failedBuilds > successfulBuilds) {
            riskLevel = "HIGH";
        }
        else if (failedBuilds > 0) {
            riskLevel = "MEDIUM";
        }
        else {
            riskLevel = "LOW";
        }


        res.json({
            successfulBuilds: successfulBuilds,
            failedBuilds: failedBuilds,
            riskLevel: riskLevel
        });


    } catch(error) {

        res.status(500).json({
            error:"Failed to analyze risk"
        });

    }
});

app.get("/devops-summary", async (req, res) => {
    try {

        const response = await axios.get(
            "https://api.github.com/repos/pristine-1712/ai-log-analyzer/actions/runs",
            {
                headers: {
                    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                    Accept: "application/vnd.github+json"
                }
            }
        );


        const runs = response.data.workflow_runs;


        const latestRun = runs[0];


        const totalBuilds = runs.length;


        const failedBuilds = runs.filter(
            run => run.conclusion === "failure"
        ).length;


        const successfulBuilds = runs.filter(
            run => run.conclusion === "success"
        ).length;


        const successRate =
            ((successfulBuilds / totalBuilds) * 100).toFixed(2);


        let riskLevel;


        if (failedBuilds > successfulBuilds) {
            riskLevel = "HIGH";
        }
        else if (failedBuilds > 0) {
            riskLevel = "MEDIUM";
        }
        else {
            riskLevel = "LOW";
        }


        res.json({

            latestDeployment:{
                workflow: latestRun.name,
                branch: latestRun.head_branch,
                status: latestRun.status,
                result: latestRun.conclusion
            },


            metrics:{
                totalBuilds: totalBuilds,
                successfulBuilds: successfulBuilds,
                failedBuilds: failedBuilds,
                successRate: successRate + "%"
            },


            riskAnalysis:{
                riskLevel: riskLevel
            }

        });


    } catch(error) {

        res.status(500).json({
            error:"Failed to generate DevOps summary"
        });

    }
});

app.get("/analyze/:id", async (req, res) => {
    try {
        const runId = req.params.id;

        // Get the real GitHub Actions logs
        const logsResponse = await axios.get(
            `http://localhost:3000/logs/${runId}`
        );

        // Convert the response into text for the AI service
        const logData = logsResponse.data;

        const logText = JSON.stringify(logData);

        // Send the real logs to the AI analyzer
        const analysis = analyzeLogs(logText);

        res.json({
            runId: runId,
            analysis: analysis
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to analyze workflow"
        });
    }
});

app.get("/analyze-latest", async (req, res) => {
    try {
        // Get recent GitHub Actions runs
        const response = await axios.get(
            "https://api.github.com/repos/pristine-1712/ai-log-analyzer/actions/runs",
            {
                headers: {
                    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                    Accept: "application/vnd.github+json"
                }
            }
        );

        // Find the latest failed run
        const failedRun = response.data.workflow_runs.find(
            run => run.conclusion === "failure"
        );

        if (!failedRun) {
            return res.json({
                message: "No failed workflow found"
            });
        }

        const runId = failedRun.id;

        // Get the real logs
        const logsResponse = await axios.get(
            `http://localhost:3000/logs/${runId}`
        );

        const logText = JSON.stringify(logsResponse.data);

        // Analyze the real logs
        const analysis = analyzeLogs(logText);

        res.json({
            runId: runId,
            workflow: failedRun.name,
            branch: failedRun.head_branch,
            result: failedRun.conclusion,
            analysis: analysis
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to analyze latest workflow"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});