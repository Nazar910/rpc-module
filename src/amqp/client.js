const EventEmitter = require('events');
const assert = require('assert');
const uuid = require('node-uuid');
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
    /**
     * Handler for AMQP message
     * @param {Object} msg - message from AMQP
     */
    _onMessage(msg) {
        const ch = this.channel;
        const correlationIds = this.correlationIds;
        const msgId = msg.properties.correlationId;
        if (correlationIds.has(msgId)) {
            ch.ack(msg);
            correlationIds.delete(msgId);
            this.emitter.emit(
                `reply-${msgId}`,
                CommandResult.fromBuffer(msg.content).data
            );
            return;
        }
        ch.reject(msg);
    }
    /**
     * Wait for reply from rpcServer
     * @param {String} replyTo - queue where to wait for reply
     * @param {String} correlationId - id of request
     * @returns {Promise} that resolves when got answer from server
     */
    _waitForReply(replyTo, correlationId) {
        const ch = this.channel;
        return new Promise(resolve => {
            this.emitter.on(`reply-${correlationId}`, resolve);
            ch.consume(replyTo, this._onMessage.bind(this));
        });
    }
    /**
     * Send command via AMQP
     * @param {String} command - command to be sent
     * @param {any} args - arguments
     * @returns {any} result
     */
    async call(command, ...args) {
        assert.ok(command, 'Command is required');
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
        this.correlationIds.add(correlationId);
        const promise = this._waitForReply(replyTo, correlationId);
        const cmd = Command.create(command, args);
        ch.sendToQueue(command, cmd.pack(), {
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
