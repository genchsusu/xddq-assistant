import GameNetMgr from "#game/net/GameNetMgr.js";
import Protocol from "#game/net/Protocol.js";
import logger from "#utils/logger.js";
import LoopMgr from "#game/common/LoopMgr.js";
import UserMgr from "#game/mgr/UserMgr.js";
import BagMgr from "#game/mgr/BagMgr.js";

export default class UnionMgr {
    constructor() {
        this.unionId = null;              // 妖盟ID
        this.memberNum = null;            // 妖盟成员数量
        this.memberList = null;           // 妖盟成员列表
        this.lastCheckTime = 0;           // 上次检查时间
        this.CHECK_CD = 1000 * 60 * 10;   // 每次间隔时间

        this.isProcessing = false;

        LoopMgr.inst.add(this);
    }

    static get inst() {
        if (!this._instance) {
            this._instance = new UnionMgr();
        }
        return this._instance;
    }

    clear() {
        LoopMgr.inst.remove(this);
    }

    inUnion() {
        return this.unionId !== null; // 是否在妖盟中
    }
    
    collectPlayerData(data) {
        return data.map(member => ({
            userId: member.playerData.playerId,
            nickName: member.playerData.nickName
        }));
    }

    // 推送妖盟数据
    pushMyUnionDataBroadcast(t) {
        this.unionId = t.baseData.unionId || null;
        this.memberNum = t.baseData.memberNum || null;
        this.memberList = this.collectPlayerData(t.memberList) || [];

        if (this.inUnion()) {
            logger.info("[妖盟管理] 妖盟广告");
            GameNetMgr.inst.sendPbMsg(Protocol.S_WATCH_AD_TASK, { activityId: 0, conditionId: 120006, isUseADTime: false }, null);
            GameNetMgr.inst.sendPbMsg(Protocol.S_TASK_GET_REWARD, { taskId: [120006] }, null);

            if (BagMgr.inst.isMallCountZero(230000011)) {
                logger.info("[自动买买买] 妖盟商店 买桃免费");
                GameNetMgr.inst.sendPbMsg(Protocol.S_MALL_BUY_GOODS, { mallId: 230000011, count: 1, activityId: 0 }, null);
                BagMgr.inst.setMallCount(230000011, 1);
            }
            if (BagMgr.inst.isMallCountZero(230000001)) {
                logger.info("[自动买买买] 妖盟商店 买桃1");
                GameNetMgr.inst.sendPbMsg(Protocol.S_MALL_BUY_GOODS, { mallId: 230000001, count: 1, activityId: 0 }, null);
                BagMgr.inst.setMallCount(230000001, 1);
            }
            if (BagMgr.inst.isMallCountZero(230000002)) {
                logger.info("[自动买买买] 妖盟商店 买桃2");
                GameNetMgr.inst.sendPbMsg(Protocol.S_MALL_BUY_GOODS, { mallId: 230000002, count: 1, activityId: 0 }, null);
                BagMgr.inst.setMallCount(230000002, 1);
            }
            if (BagMgr.inst.isMallCountZero(230000012)) {
                logger.info("[自动买买买] 妖盟商店 买腾蛇信物");
                GameNetMgr.inst.sendPbMsg(Protocol.S_MALL_BUY_GOODS, { mallId: 230000012, count: 3, activityId: 0 }, null);
                BagMgr.inst.setMallCount(230000012, 3);
            }
        }
    }

    // 砍价
    cutPriceSyncData(t) {
        if (t) {
            if (t.status == 0) {
                logger.info(`[妖盟管理] ${UserMgr.nickName} 开始砍价`);
                GameNetMgr.inst.sendPbMsg(Protocol.S_CUT_PRICE_BARGAIN, { bussinessId: t.bussinessId }, null);
            }

            if (t.status == 1 && t.bargainPrice.toNumber() >= 2888 && t.bargainTimes == t.bargainNum) {
                logger.info(`[妖盟管理] 砍到最低价，开始购买`);
                GameNetMgr.inst.sendPbMsg(Protocol.S_CUT_PRICE_BUY, { bussinessId: t.bussinessId }, null);
            }
        }      
    }

    SyncUnionBossMsg(t) {
        // 检查当前时间是否在允许刷新时间段
        const now = new Date();
        const hours = now.getHours();
        
        // 一般是晚上0点到2点，中午11点到13点, 进行妖盟讨伐
        const isBattleAllowed = 
            (hours >= 0 && hours < 2) || 
            (hours >= 11 && hours < 13);

        if (isBattleAllowed && t.addBuffCount < 1) {
            logger.info("[妖盟管理] 妖盟讨伐 妖盟布阵");
            GameNetMgr.inst.sendPbMsg(Protocol.S_UNION_BOSS_ARRAYING, {}, null);
        }

        if (t.buff.overlay == 20 && t.battleCount < 1) {
            logger.info("[妖盟管理] 妖盟讨伐 已满20人开始战斗");
            GameNetMgr.inst.sendPbMsg(Protocol.S_UNION_BOSS_BATTLE, {}, null);
        }

        if (t.battleCount == 1) {
            logger.info("[妖盟管理] 妖盟讨伐 领取成就奖励");
            GameNetMgr.inst.sendPbMsg(Protocol.S_UNION_BOSS_RECEIVE_ACHIEVE_REWARD, {taskId: 180001}, null);
        }
    }

    BossReward(t) {
        // 如果t.rewards非空，则表示有奖励可以领取
        if (t.rewards) {
            logger.debug("[妖盟管理] 妖盟讨伐 妖盟领奖");
            GameNetMgr.inst.sendPbMsg(Protocol.S_UNION_BOSS_RECEIVE_REWARD, {}, null);
        }
    }

    checkDailyTask(t) {
        const actions = [
            { threshold: 150, index: 0 },
            { threshold: 250, index: 1 },
            { threshold: 500, index: 2 },
            { threshold: 750, index: 3 },
            { threshold: 1000, index: 4 }
        ];
    
        for (const action of actions) {
            if (t.progress >= action.threshold && (!t.taskList || !t.taskList.includes(action.index))) {
                logger.info(`[妖盟管理] 领取任务收益`);
                GameNetMgr.inst.sendPbMsg(Protocol.S_UNION_GETDAILYTASK, { actIndex: action.index }, null);
            }
        }
    }

    LoopCheck() {
        const now = Date.now();
        if (now - this.lastCheckTime >= this.CHECK_CD) {
            logger.debug("[妖盟管理] 妖盟讨伐 请求砍价数据");
            GameNetMgr.inst.sendPbMsg(Protocol.S_CUT_PRICE_SYNC, {}, null);

            logger.debug("[妖盟管理] 妖盟讨伐 主动请求妖盟讨伐");
            GameNetMgr.inst.sendPbMsg(Protocol.S_UNION_BOSS_ENTER, {}, null);

            logger.debug("[妖盟管理] 妖盟讨伐 领取妖盟讨伐奖励");
            GameNetMgr.inst.sendPbMsg(Protocol.S_UNION_BOSS_GET_REWARD_INFO, {}, null);

            logger.debug("[妖盟管理] 妖盟日常任务");
            GameNetMgr.inst.sendPbMsg(Protocol.S_UNION_DAILYTASK, {}, null);

            this.lastCheckTime = now;
        }
    }

    async loopUpdate() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // 获取当前时间
            const now = new Date();
            const isWeekend = now.getDay() === 6 || now.getDay() === 0;
            if (!this.unionId || isWeekend) {
                logger.info("[妖盟管理] 未加入妖盟 或者 今天是周末");
                this.clear();
                return;
            }

            this.LoopCheck();
        } catch (error) {
            logger.error(`[妖盟管理] loopUpdate error: ${error}`);
        } finally {
            this.isProcessing = false;
        }
    }
}
