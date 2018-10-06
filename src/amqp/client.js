const EventEmitter = require('events');
const AMQPDriver = require('./base');
const Command = require('../command');
const CommandResult = require('../command-result');

class AMQPRPCClient extends AMQPDriver {
    constructor(...args) {
        super(...args);
        this._correlationIds = new Set();
        this._emitter = new EventEmitter();
    }
    get emitter() {
        return this._emitter;
    }
    get correlationIds() {
        return this._correlationIds;
    }
    _onMessage(msg) {
        const ch = this.channel;
        const correlationIds = this.correlationIds;
        const msgId = msg.properties.correlationId;
        if (correlationIds.has(msgId)) {
            ch.ack(msg);
            correlationIds.delete(msgId);
            this.emitter.emit(
                `reply-${msgId}`,
                CommandResult.fromBuffer(msg.content)
            );
            return;
        }
        ch.reject(msg);
    }
    _waitForReply(replyTo, correlationId) {
        const ch = this.channel;
        return new Promise(resolve => {
            this.emitter.on(`reply-${correlationId}`, resolve);
            ch.consume(replyTo, this._onMessage.bind(this));
        });
    }
    async call(command, args) {
        const ch = this.channel;
        assert.ok(
            ch,
            'No channel, you should call start() before'
        );
        const replyTo = `reply-${command}`;
        const replyOpts = {
            messageTtl: AMQPRPCClient.REPLY_MESSAGE_TTL
        };
        await ch.assertQueue(replyTo, replyOpts);
        const correlationId = uuid.v4();
        const promise = this._waitForReply(replyTo, correlationId);
        const cmd = Command.create(command, args);
        ch.sendToQueue(replyTo, cmd.pack(), {
            correlationId,
            replyTo
        });
        return promise;
    }

    static get REPLY_MESSAGE_TTL() {
        return 20 * 1000;
    }
}

module.exports = AMQPRPCClient;
