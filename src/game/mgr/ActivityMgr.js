import GameNetMgr from "#game/net/GameNetMgr.js";
import Protocol from "#game/net/Protocol.js";
import logger from "#utils/logger.js";


export default class ActivityMgr {
    constructor() {}

    static get inst() {
        if (!this._instance) {
            this._instance = new ActivityMgr();
        }
        return this._instance;
    }

    // 1002 1007 
    getReward(t) {
        const acts = t.activityDataList ?? t.activityConditionDataList ?? null;
        if (acts) {
            for (const i of acts) {
                const activityId = i.activityId;
                // 领取所有未领取的奖励
                for (const j of i.conditionDataList) {
                    if (!j.isGetReward && j.completeTime.toString() !== "0") {
                        logger.info(`[活动管理] ${activityId} 满足条件领取奖励: ${j.conditionId}`);
                        GameNetMgr.inst.sendPbMsg(Protocol.S_GOOD_FORTUNE_GET_REWARD_REQ, { activityId: activityId, conditionId: j.conditionId, type: 1 }, null);
                    }
                }
            }
        }
    }

    // 1003
    buyFree(t) {
        const acts = t.activityDataList;
        if (!acts) return;
    
        acts.forEach(i => {
            const mallConfig = i.detailConfig?.commonConfig?.mallConfig || [];
            mallConfig.filter(item => item.mallTempMsg.price === "100000=0").forEach(item => {
                const activityId = item.activityId;
                const { id, buyLimit, name } = item.mallTempMsg;
    
                const logAndBuy = (remaining) => {
                    logger.info(`[活动管理] ${activityId} 购买 ${name} ${remaining}次`);
                    for (let i = 0; i < remaining; i++) {
                        GameNetMgr.inst.sendPbMsg(Protocol.S_ACTIVITY_BUY_MALL_GOODS, { activityId, mallId: id, count: "1" }, null);
                    }
                };
    
                if (!i.mallBuyCountList || i.mallBuyCountList.length === 0) {
                    logAndBuy(buyLimit);
                } else {
                    const boughtItem = i.mallBuyCountList.find(j => j.mallId === id);
                    const boughtCount = boughtItem ? boughtItem.count.toNumber() : 0;
                    if (boughtCount < buyLimit) {
                        logAndBuy(buyLimit - boughtCount);
                    }
                }
            });
        });
    }
}
