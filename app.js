import { spawn } from "child_process";
import accounts from "./account.js";
import logger from "#utils/logger.js";

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
    let childProcesses = [];
    const defaultReconnectInterval = 60 * 1000 * 5; // 默认重连间隔为 5 分钟

    async function runCmd(account) {
        const reconnectInterval = account.reconnectInterval || defaultReconnectInterval;
        const identifier = `${account.serverId}_${account.username}`;

        const childProcess = spawn("node", ["./src/index.js", JSON.stringify(account)], {
            cwd: process.cwd(),
            shell: true,
            // stdio: "inherit", // 子进程的输出重定向到父进程
            stdio: "ignore", // 静音子进程的输出
            env: {
                ...process.env,
                ACCOUNT: JSON.stringify(account), // 传递账户信息
            },
        });

        childProcess.on("exit", async () => {
            logger.warn(`[守护] 子进程退出，将在 ${new Date(Date.now() + reconnectInterval).toLocaleString()} 重启`);
            restartProcess(account);
        });

        childProcess.on("error", (err) => {
            logger.error("[守护] 子进程出错", err);
        });

        childProcesses.push({ childProcess, identifier });
    }

    async function restartProcess(account) {
        const reconnectInterval = account.reconnectInterval || defaultReconnectInterval;
        const identifier = `${account.serverId}_${account.username}`;
        const index = childProcesses.findIndex(cp => cp.identifier === identifier);

        if (index !== -1) {
            childProcesses[index].childProcess.kill("SIGKILL");
            childProcesses.splice(index, 1);
        }
        await sleep(reconnectInterval);
        await runCmd(account);
    }

    for (let account of accounts) {
        logger.info(`[守护] 启动 ${account.serverId}区的 ${account.username}`);
        await runCmd(account);
        await sleep(300); // 防止同时启动大量进程
    }
})();
