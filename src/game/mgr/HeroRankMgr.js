import GameNetMgr from "#game/net/GameNetMgr.js";
import Protocol from "#game/net/Protocol.js";
import logger from "#utils/logger.js";
import LoopMgr from "#game/common/LoopMgr.js";

export default class HeroRankMgr {
    constructor() {
        this.isProcessing = false;
        this.enabled = global.account.switch.herorank || false;
        this.buyNumDaily = 0;
        this.buyNumMax = 10;
        this.energy = 0;
        this.rank = null;
        LoopMgr.inst.add(this);
    }

    static get inst() {
        if (!this._instance) {
            this._instance = new HeroRankMgr();
        }
        return this._instance;
    }

    clear() {
        LoopMgr.inst.remove(this);
    }

    SyncData(t) {
        try {
            logger.debug("[群英榜管理] 初始化");
            this.energy = t.energy || 0;
            this.buyNumDaily = t.buyNumDaily || 0;
            if (this.enabled && this.buyNumDaily < this.buyNumMax) {
                const num = this.buyNumMax - this.buyNumDaily;
                logger.info(`[群英榜管理] 购买体力 ${num}次`);
                GameNetMgr.inst.sendPbMsg(Protocol.S_HERORANK_BUY_ENERGY, { num: num }, null);
                this.buyNumDaily = this.buyNumMax;
            }
        } catch (error) {
            logger.error(`[群英榜管理] SyncData error: ${error}`);
        }
    }

    findFirstHeroRankPlayer(body) {
        try {
            return (
                body.fightPlayerList.canFightPlayerInfoList.find((player) => player.showInfo.nickName.startsWith("HeroRank_Name")) ||
                body.fightPlayerList.canFightPlayerInfoList[0]
            );
        } catch (error) {
            logger.error(`[群英榜管理] findFirstHeroRankPlayer error: ${error}`);
            return null;
        }
    }

    getFightList(t) {
        this.isProcessing = true;
        try {
            logger.debug(`[群英榜管理] 收到群英榜列表${JSON.stringify(t, null, 2)}`);
            if (t.ret === 0) {
                this.rank = t.rank || null;
                if (t.rank === 1) {
                    logger.info("[群英榜管理] 当前排名第一, 不需要再打了");
                    return;
                }
                const player = this.findFirstHeroRankPlayer(t);
                if (player) {
                    logger.info(`[群英榜管理] 找到玩家 ${player.showInfo.nickName} 准备攻击...`);
                    GameNetMgr.inst.sendPbMsg(Protocol.S_HERORANK_FIGHT, {
                        targetId: "0",
                        targetRank: player.rank,
                        masterId: player.masterId,
                        masterLv: player.masterLv,
                        appearanceId: player.showInfo.appearanceId,
                        cloudId: player.showInfo.equipCloudId,
                    }, null);
                }
            }
        } catch (error) {
            logger.error(`[群英榜管理] getFightList error: ${error}`);
        } finally {
            this.isProcessing = false;
        }
    }

    async doFight(t) {
        this.isProcessing = true;
        try {
            logger.debug(`[群英榜] 收到群英榜战斗结果${JSON.stringify(t, null, 2)}`);
            if (t.ret === 0) {
                this.energy = t.playerInfo.energy;
                if (t.allBattleRecord.isWin) {
                    logger.info(`[群英榜] 当前排名: ${t.rank} 战斗胜利, 再次请求列表...`);
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }
            }
        } catch (error) {
            logger.error(`[群英榜] doFight error: ${error}`);
        } finally {
            this.isProcessing = false;
        }
    }

    async loopUpdate() {
        if (this.isProcessing) return;
        this.isProcessing = true;
    
        try {
            const now = new Date();
            const isMonday = now.getDay() === 1;
    
            // 检查是否启用
            if (!this.enabled) {
                logger.info("[群英榜管理] 停止循环。未开启速通群英榜");
                this.clear();
                return;
            }
    
            // 检查体力
            if (this.energy < 1) {
                logger.info("[群英榜管理] 停止循环。体力不足");
                this.clear();
                return;
            }
    
            // 检查当前排名是否第一
            if (this.rank === 1) {
                logger.info("[群英榜管理] 停止循环。当前排名第一, 不需要再打了");
                this.clear();
                return;
            }
    
            // 检查是否为周一
            if (!isMonday) {
                logger.info("[群英榜管理] 停止循环。今天不是周一");
                this.clear();
                return;
            }
    
            // 检查是否是 0 点 5 分
            const isZeroFive = now.getHours() === 0 && now.getMinutes() === 5;
            if (this.enabled && this.energy > 0 && isZeroFive) {
                logger.info("[群英榜管理] 开始快速打群英榜");
                GameNetMgr.inst.sendPbMsg(Protocol.S_HERORANK_GET_FIGHT_LIST, { type: 0 }, null);
            }
        } catch (error) {
            logger.error(`[群英榜管理] loopUpdate error: ${error}`);
        } finally {
            this.isProcessing = false;
        }
    }
    
}