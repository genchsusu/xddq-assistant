import GameNetMgr from "#game/net/GameNetMgr.js";
import Protocol from "#game/net/Protocol.js";
import logger from "#utils/logger.js";
import LoopMgr from "#game/common/LoopMgr.js";

export default class InvadeMgr {
    constructor() {
        this.isProcessing = false;
        this.idx = global.account.switch.invade_index || 0;
        this.enabled = global.account.switch.invade || false;
        this.maxCount = 5

        LoopMgr.inst.add(this);
    }
    static get inst() {
        if (!this._instance) {
            this._instance = new InvadeMgr();
        }
        return this._instance;
    }
    clear() {
        LoopMgr.inst.remove(this);
    }
    InvadeDataMsg(t) {
        if (this.isProcessing) return
        this.isProcessing = true
        if (!this.enabled) {
            return
        }
        if (t.count >= this.maxCount) {
            logger.info(`[异兽入侵]已完成挑战,挑战次数:${t.count}`);
            return
        }
        try {
            logger.debug("[异兽入侵] 初始化");
            this.count = t.count || 0;
            this.curInvadeId = t.curInvadeId || 0
            logger.info(`[异兽入侵]当前次数:${t.count}`);
            //切换到分身
            GameNetMgr.inst.sendPbMsg(Protocol.S_ATTRIBUTE_SWITCH_SEPARATION_REQ, { separationIdx: this.idx }, null);
            GameNetMgr.inst.sendPbMsg(Protocol.S_ATTRIBUTE_GET_SEPARATION_DATAA_MSG_LIST_REQ, {}, null);
            //挑战
            GameNetMgr.inst.sendPbMsg(Protocol.S_INVADE_CHALLENGE, {}, null);
        } catch (error) {
            logger.error(`[异兽入侵] InvadeDataMsg error: ${error}`);
        } finally {
            this.isProcessing = false
        }
    }

    InvadeChallengeResp(t) {
        if (t.ret == 0) {
            logger.info(`[异兽入侵]挑战成功`);
        }
    }
}
