import { spawn } from "child_process";
import account from "./account.js";
import logger from "#utils/logger.js";

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
    let childProcess;
    const reconnectInterval = account.reconnectInterval || 60 * 1000 * 5;

    async function runCmd() {
        childProcess = spawn("node", ["./src/index.js"], {
            cwd: process.cwd(),
            shell: true,
            stdio: "inherit",
            env: {
                ...process.env,
            },
        });

        childProcess.on("exit", async () => {
            logger.warn(`[守护] 子进程退出，将在 ${new Date(Date.now() + reconnectInterval).toLocaleString()} 重启`);
            restartProcess();
        });

        childProcess.on("error", (err) => {
            logger.error("[守护] 子进程出错", err);
        });
    }

    async function restartProcess() {
        if (childProcess) {
            childProcess.kill("SIGKILL");
        }
        await sleep(reconnectInterval);
        await runCmd();
    }

    await runCmd();
})();