const assert = require('assert');

class CommandResult {
    /**
     * @constructor
     * @param {any} data - data to be sent
     */
    constructor(data) {
        assert.ok(data, 'Data required');
        this.data = data;
    }

    /**
     * Creates instace of CommandResult
     * @param  {...any} args
     * @returns {CommandResult}cmdRes
     */
    static create(...args) {
        return new this(...args);
    }

    /**
     * Parse binary data and create CommandResult instance
     * @param {Buffer} buffer - binary data
     * @returns {CommandResult} cmdRes
     */
    static fromBuffer(buffer) {
        const data = JSON.parse(buffer.toString());
        return CommandResult.create(data);
    }

    /**
     * Converts CommandResult into Buffer
     */
    pack() {
        return Buffer.from(JSON.stringify(this.data));
    }
}

module.exports = CommandResult;
