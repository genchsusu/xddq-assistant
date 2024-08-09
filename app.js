import { spawn } from "child_process";
import logger from "#utils/logger.js";
import fs from 'fs';

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
    logger.info(`[守护] 父进程的 PID: ${process.pid}`);

    let childProcesses = [];
    const retries = {}; // 存储每个账户的重连次数
    const defaultReconnectInterval = 60 * 1000 * 5; // 默认重连间隔为 5 分钟
    const maxRetries = 5; // 最大重连次数

    async function runCmd(account) {
        const reconnectInterval = account.reconnectInterval || defaultReconnectInterval;
        const identifier = `${account.serverId}_${account.username}`;
        const accountName = account.nickName || account.username;

        if (!retries[identifier]) {
            retries[identifier] = 0;
        }

        if (retries[identifier] >= maxRetries) {
            logger.warn(`[守护] ${account.serverId}区的 ${accountName} 已达到最大重连次数 ${maxRetries}，不再重连`);
            return;
        }

        const childProcess = spawn("node", ["./src/index.js"], {
            cwd: process.cwd(),
            shell: true,
            stdio: "ignore", // 静音子进程的输出
            env: {
                ...process.env,
                ACCOUNT: JSON.stringify(account), // 传递账户信息
            },
        });

        logger.info(`[守护] 启动 ${account.serverId}区的 ${accountName} PID: ${childProcess.pid}`);

        childProcess.on("exit", async () => {
            retries[identifier]++;
            logger.warn(`[守护] 子进程退出，将在 ${new Date(Date.now() + reconnectInterval).toLocaleString()} 重启 (重连次数: ${retries[identifier]}/${maxRetries})`);
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
        const accountName = account.nickName || account.username;
        const index = childProcesses.findIndex(cp => cp.identifier === identifier);

        if (index !== -1) {
            logger.info(`[守护] 杀死 ${account.serverId}区的 ${accountName} PID: ${childProcesses[index].childProcess.pid}`);
            childProcesses[index].childProcess.kill("SIGKILL");
            childProcesses.splice(index, 1);
        }
        await sleep(reconnectInterval);
        await runCmd(account);
    }

    let accounts;
    try {
        const data = fs.readFileSync('./account.json', 'utf8');
        accounts = JSON.parse(data);
    } catch (err) {
        logger.error('account.json 读取或解析文件时出错:', err);
        process.exit(1);
    }

    for (let account of accounts) {
        if (account.enabled) {
            await runCmd(account);
            await sleep(300); // 防止同时启动大量进程
        }
    }
})();
