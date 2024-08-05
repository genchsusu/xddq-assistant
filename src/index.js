import initialize from "#loaders/index.js";

async function start() {
    const account = JSON.parse(process.env.ACCOUNT); // 获取传递的账户信息
    const { username, password, serverId, token, uid } = account;
    global.account = account; // 设置 global.account
    global.configFile = "account.json";
    await initialize(username, password, serverId, token, uid);
}

start();