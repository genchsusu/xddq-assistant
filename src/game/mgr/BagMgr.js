import GameNetMgr from "#game/net/GameNetMgr.js";
import Protocol from '#game/net/Protocol.js';
import logger from "#utils/logger.js";
import LoopMgr from '#game/common/LoopMgr.js';
import PlayerAttributeMgr from "./PlayerAttributeMgr.js";

export default class BagMgr {
    constructor() {
        this.bagData = [];
        this.mallBuyCountList = [];
        this.isProcessing = false;
        this.initialized = false;

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
        if (!this.initialized) {
            logger.info(`[背包管理] 当前有仙桃: ${this.getGoodsNum(100004)} 仙玉: ${this.getGoodsNum(100000)}` );
            this.initialized = true;
        }
    }

    setMallCount(mallId, count) {
        const mallItem = this.mallBuyCountList.find(item => item.mallId === mallId);
        if (mallItem) {
            mallItem.count = count;
        } else {
            this.mallBuyCountList.push({ mallId, count });
        }
    }

    isMallCountZero(mallId) {
        const mallItem = this.mallBuyCountList.find(item => item.mallId === mallId);
        return mallItem ? mallItem.count === 0 : false;
    }

    checkBuyGoods(t) {
        this.mallBuyCountList = t.mallBuyCountList || [];
        if (this.isMallCountZero(250000001)) {
            logger.info("[自动买买买] 群英镑商店 买桃");
            GameNetMgr.inst.sendPbMsg(Protocol.S_MALL_BUY_GOODS, { mallId: 250000001, count: 1, activityId: 0 }, null);
            this.setMallCount(250000001, 1); // 更新购买数量
        }
    }

    getGoodsNum(id) {
        const item = this.bagData.find((item) => item.propId === id);
        return item ? item.num : 0;
    }

    async loopUpdate() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // 斗法券大于一定数量的时候自动斗法, 初始为2, 每多1个vip等级加3
            const fightTicket = this.getGoodsNum(100026);

            const vipLevel = (PlayerAttributeMgr.isMonthCardVip ? 1 : 0) + (PlayerAttributeMgr.isYearCardVip ? 1 : 0);
            const count = 2 + vipLevel * 3;
            if (fightTicket > count) {
                logger.info(`[背包管理] 还剩 ${fightTicket} 张斗法券`);
                GameNetMgr.inst.sendPbMsg(Protocol.S_RANK_BATTLE_GET_BATTLE_LIST, {}, null);
                await new Promise((resolve) => setTimeout(resolve, 1000));
                GameNetMgr.inst.sendPbMsg(Protocol.S_RANK_BATTLE_CHALLENGE, { index: 0 }, null);
            }

            // 万年灵芝 > 0 的时候自动激活
            const books = this.getGoodsNum(100008);
            if (books > 0) {
                logger.info(`[背包管理] 还剩 ${books} 万年灵芝`);
                GameNetMgr.inst.sendPbMsg(Protocol.S_TALENT_READ_BOOK, { readTimes: books.toString() }, null);
            }
        } catch (error) {
            logger.error(`[背包管理] 循环任务失败 ${error}`);
        } finally {
            this.isProcessing = false;
        }
    }
}
