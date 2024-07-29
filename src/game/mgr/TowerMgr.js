import GameNetMgr from "#game/net/GameNetMgr.js";
import Protocol from "#game/net/Protocol.js";
import logger from "#utils/logger.js";
import LoopMgr from "#game/common/LoopMgr.js";
import PalaceMgr from "#game/mgr/PalaceMgr.js";

export default class TowerMgr {
    constructor() {
        this.isProcessing = false;
        this.data = {};
        this.hasReward = false;
        this.challenge = global.account.switch.challenge;
        this.showResult = global.account.switch.showResult || false;
        LoopMgr.inst.add(this);
    }

    static get inst() {
        if (!this._instance) {
            this._instance = new TowerMgr();
        }
        return this._instance;
    }

    clear() {
        LoopMgr.inst.remove(this);
    }

    SyncData(t) {
        this.isProcessing = true;
        this.data = t || {};
        this.isProcessing = false;
    }

    challengeResult(t) {
        if (this.showResult) {
            if (t.ret === 0) {
                const currentStage = t.towerDataSync.curPassId % 10 === 0 ? 10 : t.towerDataSync.curPassId % 10;
                logger.info(`[镇妖塔管理] ${t.allBattleRecord.isWin} ${Math.ceil(t.towerDataSync.curPassId / 10)}层${currentStage}关`);
            } else {
                // 失败说明需要一键选择Buff
                GameNetMgr.inst.sendPbMsg(Protocol.S_TOWER_SELECT_BUFF, {index: 0, isOneKey: true}, null);
                GameNetMgr.inst.sendPbMsg(Protocol.S_TOWER_CHALLENGE, {index: 0, isOneKey: true}, null);
            }
        }
    }

    processReward() {
        if (this.data.curPassId == 0 ) {
            // TODO 判断是否已开启仙宫
            // if (!PalaceMgr.inst.checkIsMiracle && PalaceMgr.Enabled) {
            if (!PalaceMgr.inst.checkIsMiracle) {
                return;
            }
            logger.info("[镇妖塔管理] 开始领取镇妖塔奖励");
            GameNetMgr.inst.sendPbMsg(Protocol.S_TOWER_VIEW_SAVE_SELECT, { markPreference: [{priority: 1,skillType: 1017},{priority: 2,skillType: 1018},{priority: 3,skillType: 1023},{priority: 4,skillType: 1024},{priority: 5,skillType: 1022}] }, null);
            GameNetMgr.inst.sendPbMsg(Protocol.S_TOWER_QUICK_CHANLLENGE, {}, null);
            GameNetMgr.inst.sendPbMsg(Protocol.S_TOWER_SELECT_BUFF, {index: 0, isOneKey: true}, null);
            this.hasReward = true;
        }
    }

    async loopUpdate() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            if (this.challenge == 0) {
                this.clear();
                logger.info("[镇妖塔管理] 任务完成停止循环");
            } else {
                GameNetMgr.inst.sendPbMsg(Protocol.S_TOWER_CHALLENGE, {index: 0, isOneKey: true}, null);
                this.challenge--;
            }

            if (!this.hasReward) {
                this.processReward();
            }
        } catch (error) {
            logger.error(`[镇妖塔管理] loopUpdate error: ${error}`);
        } finally {
            this.isProcessing = false;
        }
    }
}
