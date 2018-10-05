const amqp = require('amqplib');
const assert = require('assert');
const EventEmitter = require('events');
const _ = require('lodash');
class AMQPDriver {
    constructor(amqpUri) {
        assert.ok(amqpUri, 'amqpUri is required!');
        assert.ok(_.isString(amqpUri), 'amqpUri should be string');
        this._amqpUri = amqpUri;
        this.emitter = new EventEmitter();
    }

    get connection() {
        return this._connection;
    }

    get channel() {
        return this._channel;
    }

    static get RECONNECT_TIMEOUT() {
        return 2 * 1000;
    }

    async _getConnection() {
        let conn = this.connection;
        while (!conn) {
            try {
                console.log('About to init connection');
                conn = await amqp.connect(this._amqpUri);
                this._connection = conn;
            } catch (_) {
                console.error('Failed to connect to amqp');
                await new Promise(resolve => setTimeout(resolve, AMQPDriver.RECONNECT_TIMEOUT));
                console.error('Attempring to reconnect');
            }
        }
        return conn;
    }

    async _initChannel() {
        if (this.channel) {
            return;
        }
        console.log('About to create channel');
        const conn = await this._getConnection();
        const ch = await conn.createChannel();
        this._channel = ch;
    }

    async start() {
        await this._initChannel();
    }

    static create(...args) {
        return new this(...args);
    }
}

class AMQPRPCClient extends AMQPDriver {
    constructor(...args) {
        super(...args);
        this._correlationIds = new Set();
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
            this.emitter.emit(`reply-${msgId}`, Command.fromBuffer(msg.content));
        }
        ch.reject(msg);
    }
    _waitForReply(replyTo, correlationId) {
        return new Promise(resolve => {
            this.emitter.on(`reply-${correlationId}`, resolve);
            ch.consume(replyTo, this._onMessage.bind(this));
        });
    }
    async call(command, args) {
        const ch = this.channel;
        assert.ok(ch, 'No channel, you should call start() before');
        const replyTo = `reply-${command}`;
        const replyOpts = {
            messageTtl: AMQPRPCClient.REPLY_MESSAGE_TTL
        };
        await ch.assertQueue(replyTo, replyOpts);
        const correlationId = uuid.v4();
        const promise = this._waitForReply(replyTo, correlationId);
        const cmd = new Command(command, args);
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
class AMQPRPCServer extends AMQPDriver {
    async addHandler(command, job) {
        const ch = this.channel;
        await ch.assertQueue(command);
        ch.consume(command, async (msg) => {
            const { replyTo, correlationId } = msg.properties;
            const cmd = Command.fromBuffer(msg.content);
            const result = await job(...cmd.args);
            const replyCmd = new CommandResult(result).pack();
            ch.sendToQueue(replyTo, replyCmd, {
                correlationId
            });
        });
    }
}

module.exports = {
    AMQPRPCClient,
    AMQPRPCServer
}
