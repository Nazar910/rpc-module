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

    /**
     * Ensures this.connection
     */
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
                console.error('Attempting to reconnect');
            }
        }
        return conn;
    }

    /**
     * Closes connection
     */
    async _closeConnection() {
        if (!this.connection) {
            return;
        }
        await this.connection.close();
    }

    /**
     * Creates channel object (if absent)
     * and store it in this.channel
     */
    async _initChannel() {
        if (this.channel) {
            return;
        }
        console.log('About to create channel');
        const conn = await this._getConnection();
        const ch = await conn.createChannel();
        this._channel = ch;
    }

    /**
     * Closes channel
     */
    async _closeChannel() {
        if (!this.channel) {
            return;
        }
        await this.channel.close();
    }

    /**
     * Start rpc
     * Initializes connection and channel
     */
    async start() {
        await this._initChannel();
    }

    /**
     * Closes connection and channel
     */
    async close() {
        await this._closeChannel();
        await this._closeConnection();
    }

    /**
     * Factory method for creating instance of amqpDriver
     * @param  {...any} args - arguments for object creation
     * @returns {AMQPDriver}
     */
    static create(...args) {
        return new this(...args);
    }
}

module.exports = AMQPDriver;
