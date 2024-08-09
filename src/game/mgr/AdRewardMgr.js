import GameNetMgr from "#game/net/GameNetMgr.js";
import Protocol from "#game/net/Protocol.js";
import logger from "#utils/logger.js";
import LoopMgr from "#game/common/LoopMgr.js";
export default class AdRewardMgr {
    constructor() {
        this.isProcessing = false;
        this.INTERVAL = 1000 * 12;
        this.lastExecuteTime = 0;
        this.taskList = [];
        LoopMgr.inst.add(this);
    }

    static get inst() {
        if (!this._instance) {
            this._instance = new AdRewardMgr();
        }
        return this._instance;
    }

    SyncVip(isVip) { 
        logger.info(`[广告管理] 同步VIP状态 ${isVip}`);
        this.INTERVAL = isVip ? 1000 : 12000;
    }
    // {
    //     protoId,
    //     data,
    //     logStr
    // }
    AddAdRewardTask(adTask) {
        logger.info(`[广告管理] 增加待执行任务 ${adTask.protoId}  ${adTask.logStr}`);
        this.taskList.push(adTask);
        // return GameNetMgr.inst.sendPbMsg(Protocol.S_HOMELAND_REFRESH_RESOURCE, { type: 1, position: -1, itemId: 0, isUseADTime: false }, null);
    }

    RunAdRewardTask() {
        if (this.taskList.length > 0) {
            let firstTask = this.taskList[0]
            if (firstTask.protoId && firstTask.data) {
                logger.info(`[广告管理] 执行任务 ${firstTask.logStr}`);
                GameNetMgr.inst.sendPbMsg(firstTask.protoId, firstTask.data, null);
                this.taskList.splice(0, 1)
            }
        }
    }

    clear() {
        LoopMgr.inst.remove(this);
    }

    async loopUpdate() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const now = Date.now();
            if (now - this.lastExecuteTime >= this.INTERVAL) {
                this.lastExecuteTime = now;
                this.RunAdRewardTask();
            }

        } catch (error) {
            logger.error(`[广告管理] loopUpdate error: ${error}`);
        } finally {
            this.isProcessing = false;
        }
    }
}
