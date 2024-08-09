import GameNetMgr from "#game/net/GameNetMgr.js";
import Protocol from "#game/net/Protocol.js";
import logger from "#utils/logger.js";
import LoopMgr from "#game/common/LoopMgr.js";

export default class StarTrialMgr {
    constructor() {
        this.isProcessing = false;
        this.enabled = global.account.switch.starTrial || false;
        this.maxCount = 30
        this.challengeTimes = 30
        this.rewardState = 0
        LoopMgr.inst.add(this);
    }
    static get inst() {
        if (!this._instance) {
            this._instance = new StarTrialMgr();
        }
        return this._instance;
    }
    clear() {
        LoopMgr.inst.remove(this);
    }
    SyncStarTrialData(t) {
        this.challengeTimes = t.challengeTimes
        this.bossId = t.bossId
        this.rewardState = t.rewardState
    }
    StarTrialChallenge() {
        // 开始战斗
        logger.info(`[星宿试炼]挑战星宿`)
        GameNetMgr.inst.sendPbMsg(Protocol.S_STARTRIAL_Fight, { BossId: t.bossId }, null);
        //开始领奖
        if (this.rewardState == 0) {
            logger.info(`[星宿试炼]领取每日奖励奖`)
            GameNetMgr.inst.sendPbMsg(Protocol.S_STARTRIAL_GetDailyFightReward, {}, null);
        }
    }

    async loopUpdate() {
        if (!this.enabled) return
        if (this.isProcessing) return
        this.isProcessing = true
        try {
            if (this.maxCount - this.challengeTimes <= 20) {
                logger.info(`[星宿试炼]任务完成,停止循环,剩余挑战次数:${this.challengeTimes}`)
                this.clear()
                return
            }
            this.StarTrialChallenge()
            this.challengeTimes--
        } catch (error) {
            logger.error(`[星宿试炼] loopUpdate error: ${error}`);
        } finally {
            this.isProcessing = false
        }
    }
}
