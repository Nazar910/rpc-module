const assert = require('assert');
const _ = require('lodash');
const AMQPDriver = require('./base');
const Command = require('../command');
const CommandResult = require('../command-result');

class AMQPRPCServer extends AMQPDriver {
    async addHandler(command, job) {
        assert.ok(command, 'Command is required');
        assert.ok(_.isString(command), 'Command should be string');
        assert.ok(job, 'Job is required');
        assert.ok(_.isFunction(job), 'Job should be a function');
        const ch = this.channel;
        assert.ok(ch, 'No channel, you should call start() before');
        await ch.assertQueue(command);
        ch.consume(command, async (msg) => {
            const { replyTo, correlationId } = msg.properties;
            const cmd = Command.fromBuffer(msg.content);
            const result = await job(...cmd.args);
            const replyCmd = CommandResult.create(result);
            ch.sendToQueue(replyTo, replyCmd.pack(), {
                correlationId
            });
        });
    }
}

module.exports = AMQPRPCServer;
