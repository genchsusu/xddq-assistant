import GameNetMgr from "#game/net/GameNetMgr.js";
import Protocol from '#game/net/Protocol.js';
import logger from "#utils/logger.js";
import LoopMgr from '#game/common/LoopMgr.js';
import PlayerAttributeMgr from "./PlayerAttributeMgr.js";

export default class BagMgr {
    constructor() {
        this.bagData = [];
        this.isProcessing = false;
        LoopMgr.inst.add(this);
    }

    static get inst() {
        if (!this._instance) {
            this._instance = new BagMgr();
        }
        return this._instance;
    }

    clear() {
        this.bagData = [];
        LoopMgr.inst.remove(this);
    }

    SyncBagMsg(t) {
        if (Array.isArray(t.bagData)) {
            t.bagData.forEach((newItem) => {
                const existingItem = this.bagData.find((item) => item.propId === newItem.propId);
                if (existingItem) {
                    existingItem.num = newItem.num;
                } else {
                    this.bagData.push(newItem);
                }
            });
            logger.debug("[背包管理] 更新背包数据");
        }
    }

    isMallCountZero(mallBuyCountList, mallId) {
        const mallItem = mallBuyCountList.find(item => item.mallId === mallId);
        return mallItem ? mallItem.count === 0 : false;
    }

    checkBuyGoods(t) {
        const mallBuyCountList = t.mallBuyCountList || [];
        if (this.isMallCountZero(mallBuyCountList, 230000011)) {
            logger.info("[妖盟管理] 妖盟买桃免费");
            GameNetMgr.inst.sendPbMsg(Protocol.S_MALL_BUY_GOODS, { mallId: 230000011, count: 1, activityId: 0 }, null);
        }
        if (this.isMallCountZero(mallBuyCountList, 230000001)) {
            logger.info("[妖盟管理] 妖盟买桃1");
            GameNetMgr.inst.sendPbMsg(Protocol.S_MALL_BUY_GOODS, { mallId: 230000001, count: 1, activityId: 0 }, null);
        }
        if (this.isMallCountZero(mallBuyCountList, 230000002)) {
            logger.info("[妖盟管理] 妖盟买桃2");
            GameNetMgr.inst.sendPbMsg(Protocol.S_MALL_BUY_GOODS, { mallId: 230000002, count: 1, activityId: 0 }, null);
        }
        if (this.isMallCountZero(mallBuyCountList, 230000012)) {
            logger.info("[妖盟管理] 妖盟买腾蛇信物");
            GameNetMgr.inst.sendPbMsg(Protocol.S_MALL_BUY_GOODS, { mallId: 230000012, count: 3, activityId: 0 }, null);
        }
        if (this.isMallCountZero(mallBuyCountList, 250000001)) {
            logger.info("[群英镑管理] 群英镑商店买桃");
            GameNetMgr.inst.sendPbMsg(Protocol.S_MALL_BUY_GOODS, {mallId: 250000001, count: 1, activityId: 0}, null);
        } 
    }

    findItemById(id) {
        return this.bagData.find((item) => item.propId === id) || { num: 0 };
    }

    async loopUpdate() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // 斗法券大于一定数量的时候自动斗法, 初始为2, 每多1个vip等级加3
            const fightTicket = this.findItemById(100026);

            const vipLevel = (PlayerAttributeMgr.isMonthCardVip ? 1 : 0) + (PlayerAttributeMgr.isYearCardVip ? 1 : 0);
            const count = 2 + vipLevel * 3;
            if (fightTicket.num > count) {
                logger.info(`[背包管理] 还剩 ${fightTicket.num} 张斗法券`);
                GameNetMgr.inst.sendPbMsg(Protocol.S_RANK_BATTLE_GET_BATTLE_LIST, {}, null);
                await new Promise((resolve) => setTimeout(resolve, 1000));
                GameNetMgr.inst.sendPbMsg(Protocol.S_RANK_BATTLE_CHALLENGE, { index: 0 }, null);
            }

            // 万年灵芝 > 0 的时候自动激活
            const books = this.findItemById(100008);
            if (books.num > 0) {
                logger.info(`[背包管理] 还剩 ${books.num} 万年灵芝`);
                GameNetMgr.inst.sendPbMsg(Protocol.S_TALENT_READ_BOOK, { readTimes: books.num }, null);
            }
        } catch (error) {
            logger.error(`[背包管理] 循环任务失败 ${error}`);
        } finally {
            this.isProcessing = false;
        }
    }
}
