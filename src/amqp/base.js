const amqp = require('amqplib');
const assert = require('assert');
const _ = require('lodash');
class AMQPDriver {
    constructor(amqpUri) {
        assert.ok(amqpUri, 'amqpUri is required!');
        assert.ok(_.isString(amqpUri), 'amqpUri should be string');
        this._amqpUri = amqpUri;
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

module.exports = AMQPDriver;
