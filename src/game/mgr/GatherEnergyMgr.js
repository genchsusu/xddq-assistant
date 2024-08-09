import GameNetMgr from "#game/net/GameNetMgr.js";
import Protocol from "#game/net/Protocol.js";
import logger from "#utils/logger.js";
import LoopMgr from "#game/common/LoopMgr.js";
import AdRewardMgr from "#game/mgr/AdRewardMgr.js";

export default class GatherEnergyMgr {
    constructor() {
        this.AD_REWARD_DAILY_MAX_NUM = 3;   // 每日最大领取次数
        this.AD_REWARD_CD = 1000;           // 每次间隔时间
        this.getAdRewardTimes = 0;          // 已领取次数, 默认为0, 防止夜间不work
        this.lastAdRewardTime = 0;          // 上次领取时间

        this.isProcessing = false;

        LoopMgr.inst.add(this);
    }

    static get inst() {
        if (!this._instance) {
            this._instance = new GatherEnergyMgr();
        }
        return this._instance;
    }

    clear() {
        LoopMgr.inst.remove(this);
    }

    // "gatherEnergy": {
    //     "state": 0,
    //     "openNum": 0,
    //     "attendNum": 0,
    //     "hadLike": false,
    //     "getTimes": 0
    // }
    checkReward(t) {
        this.isProcessing = true;
        logger.info(`[聚灵阵管理] 检查聚灵阵奖励`);
        this.getAdRewardTimes = t.gatherEnergy.getTimes || 0;
        this.isProcessing = false;
    }

    processReward() {
        const now = Date.now();
        if (this.getAdRewardTimes < this.AD_REWARD_DAILY_MAX_NUM && now - this.lastAdRewardTime >= this.AD_REWARD_CD) {
            logger.info(`[聚灵阵管理] 还剩 ${this.AD_REWARD_DAILY_MAX_NUM - this.getAdRewardTimes} 次广告激励`);
            // GameNetMgr.inst.sendPbMsg(Protocol.S_GATHER_ENERGY_GET_AD_AWARD, { isUseADTime: false }, null);

            const logContent = `[聚灵阵] 还剩 ${this.AD_REWARD_DAILY_MAX_NUM - this.getAdRewardTimes} 次广告激励`;
            AdRewardMgr.inst.AddAdRewardTask({protoId : Protocol.S_GATHER_ENERGY_GET_AD_AWARD, data : { isUseADTime: false }, logStr : logContent});

            this.getAdRewardTimes++;
            this.lastAdRewardTime = now;
        }
    }

    async loopUpdate() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            if (this.getAdRewardTimes >= this.AD_REWARD_DAILY_MAX_NUM) {
                // this.clear();
                logger.debug("[聚灵阵管理] 达到每日最大领取次数，停止奖励领取");
            } else {
                this.processReward();
            }
            // TODO 自动开启聚灵阵 21:30-22:00有高级聚灵阵 自动进入
        } catch (error) {
            logger.error(`[聚灵阵管理] loopUpdate error: ${error}`);
        } finally {
            this.isProcessing = false;
        }
    }
}
