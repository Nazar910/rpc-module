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
     * Converts CommandResult into Buffer
     */
    pack() {
        return Buffer.from(JSON.stringify({
            data: this.data
        }));
    }
}

module.exports = CommandResult;
