const assert = require('assert');
const uuid = require('uuid');
const AMQPDriver = require('./base');
const Command = require('../command');
const CommandResult = require('../command-result');

class AMQPRPCClient extends AMQPDriver {
    constructor(...args) {
        super(...args);
    }
    /**
     * Waits for msg with correlation id
     * @param {object} channel - amqplib channel obj
     * @param {string} queueName - queue name
     * @param {number} correlationId - id of msg to expect
     * @returns {Promise} that resolves with msg
     */
    _waitForMsgWithCorrelationId (channel, queueName, correlationId) {
        return new Promise(resolve => {
            channel.consume(queueName, (msg) => {
                if (msg.properties.correlationId === correlationId) {
                    channel.ack(msg);
                    resolve(CommandResult.fromBuffer(msg.content).data);
                } else {
                    channel.reject(msg);
                }
            });
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
        const conn = await this._getConnection();
        const ch = await conn.createChannel();
        const q = await ch.assertQueue('', { exclusive: true });
        const replyTo = q.queue;
        const correlationId = uuid.v4();
        const promise = this._waitForMsgWithCorrelationId(ch, replyTo, correlationId);
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
        await ch.close();
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
