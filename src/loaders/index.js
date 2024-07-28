import AuthService from "#services/authService.js";
import dependencyInjectorLoader from "#loaders/dependencyInjector.js";
import GameNetMgr from "#game/net/GameNetMgr.js";
import logger from '#utils/logger.js';

export default async (username, password, serverId, app_pst, uid) => {
    await dependencyInjectorLoader();

    const authServiceInstance = new AuthService();

    try {
        // Login first, and then fetch the wsAddress and token
        let response;
        
        try {
            if (app_pst && uid) {
                logger.info("[Login] 尝试使用token登录...");
                response = await authServiceInstance.LoginWithToken(serverId, app_pst, uid, username);
            } else {
                throw new Error("[Login] token登陆信息不完整, 尝试使用用户名密码登录...");
            }
        } catch (error) {
            logger.warn("[Login] token登录失败, 尝试使用用户名密码登录...");
            response = await authServiceInstance.Login(username, password, serverId);
        }
        
        // Initialize WebSocket
        const { wsAddress, playerId, token } = response;
        GameNetMgr.inst.connectGameServer(wsAddress, playerId, token);
    } catch (error) {
        logger.error(error.message || error);
    }
};

