const assert = require('assert');
const _ = require('lodash');

class Command {
    /**
     * @constructor
     * @param {String} command - command name
     * @param {Array} args - argument array
     */
    constructor(command, args) {
        assert.ok(command, 'Command is required');
        assert.ok(_.isString(command), 'Command should be string');
        assert.ok(args, 'Args required');
        assert.ok(_.isArray(args), 'Args should be array')
        this.command = command;
        this.args = args;
    }

    /**
     * Create new instance of Command
     * @param  {...any} args
     */
    static create(...args) {
        return new this(...args);
    }

    /**
     * Parse binary data and create new command instance
     * @param {Buffer} buffer - binary data for new command instance
     * @returns {Command} cmd
     */
    static fromBuffer(buffer) {
        const { command, args } = JSON.parse(buffer.toString());
        return Command.create(command, args);
    }

    /**
     * Convert command data to json and return binary
     * representation
     */
    pack() {
        const { args, command } = this;
        return Buffer.from(JSON.stringify({command, args}));
    }
}

module.exports = Command;
