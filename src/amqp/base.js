const amqp = require('amqplib');
const assert = require('assert');
const _ = require('lodash');
const { EventEmitter } = require('events');
class AMQPDriver {
    static get states() {
        const states = {
            IDLE: 'IDLE',
            STARTING: 'STARTING',
            ACTIVE: 'ACTIVE'
        }
        return states;
    }

    constructor(amqpUri) {
        assert.ok(amqpUri, 'amqpUri is required!');
        assert.ok(_.isString(amqpUri), 'amqpUri should be string');
        this._amqpUri = amqpUri;
        this.state = AMQPDriver.states.IDLE;
        this.stateEmitter = new EventEmitter();
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
     * Creates new connection
     */
    async _createConnection() {
        let conn = null;
        while (!conn) {
            try {
                conn = await amqp.connect(this._amqpUri);
                return conn;
            } catch (_) {
                await new Promise(resolve => setTimeout(resolve, AMQPDriver.RECONNECT_TIMEOUT));
            }
        }
        return conn;
    }

    /**
     * Ensures this.connection
     */
    async _getConnection() {
        if (this.connection) {
            return this.connection;
        }
        const conn = await this._createConnection();
        this._connection = conn;
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
        this.state = AMQPDriver.states.STARTING;
        console.log('Set status to STARTING');
        const conn = await this._getConnection();
        const ch = await conn.createChannel();
        this._channel = ch;
        this.state = AMQPDriver.states.ACTIVE;
        console.log('Set status to ACTIVE');
        this.stateEmitter.emit(AMQPDriver.states.ACTIVE);
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
        //if is starting
        // console.log('About to start');
        // console.log('State', this.state);
        // if (this.state === AMQPDriver.states.STARTING) {
        //     await new Promise(resolve =>
        //         this.stateEmitter.once(AMQPDriver.states.ACTIVE, resolve)
        //     );
        // }
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
