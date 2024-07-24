import { spawn } from "child_process";
import account from "./account.js";
import logger from "#utils/logger.js";

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
    let childProcess;
    const reconnectInterval = account.reconnectInterval || 60 * 1000 * 5;
    let isScheduledRestart = false; // 标志位

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
            if (!isScheduledRestart) {
                logger.warn(`[守护] 子进程退出，将在 ${new Date(Date.now() + reconnectInterval).toLocaleString()} 重启`);
                restartProcess();
            }
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

    function calculateTimeoutToMidnight() {
        const now = new Date();
        const nextMidnight = new Date(now);
        nextMidnight.setHours(0, 0, 0, 0);
        nextMidnight.setDate(nextMidnight.getDate() + 1); // 设置为每天的 00:00
        return nextMidnight - now;
    }

    function scheduleMidnightRestart() {
        const timeout = calculateTimeoutToMidnight();
        logger.info(`[守护] 将在 ${new Date(Date.now() + timeout).toLocaleString()} 重启`);
        setTimeout(async () => {
            isScheduledRestart = true; // 设置标志位，表示这是计划中的重启
            await restartProcess();
            isScheduledRestart = false; // 重置标志位
            scheduleMidnightRestart();
        }, timeout);
    }

    await runCmd();
    scheduleMidnightRestart();
})();
