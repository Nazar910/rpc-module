const EventEmitter = require('events');
const assert = require('assert');
const uuid = require('uuid');
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
        console.log('Got message', msg);
        const ch = this.channel;
        const correlationIds = this.correlationIds;
        const msgId = msg.properties.correlationId;
        if (correlationIds.has(msgId)) {
            console.log('About to ack');
            ch.ack(msg);
            correlationIds.delete(msgId);
            this.emitter.emit(
                `reply-${msgId}`,
                CommandResult.fromBuffer(msg.content).data
            );
            return;
        }
        console.log('About to reject');
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
            this.emitter.once(`reply-${correlationId}`, resolve);
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
        await super.start();
        assert.ok(command, 'Command is required');
        const ch = this.channel;
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
        const result = await promise;
        if (result.error) {
            const rpcError = JSON.parse(result.error);
            const err = new Error();
            Object.assign(err, rpcError);
            throw err;
        }
        return result;
    }

    static get REPLY_MESSAGE_TTL() {
        return 20 * 1000;
    }

    /**
     * Sends data to queue
     * @param {String} queueName - queue name
     * @param {Object} data - data to send
     */
    async sendRaw(queueName, data = {}) {
        await super.start();
        assert.ok(queueName, 'Queue name is required');
        const ch = this.channel;
        const body = Buffer.from(JSON.stringify(data));
        ch.sendToQueue(queueName, body);
    }
}

module.exports = AMQPRPCClient;
