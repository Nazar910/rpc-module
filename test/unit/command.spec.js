const Command = require('../../src/command');
const { expect } = require('chai');
describe('Command', () => {
    describe('create', () => {
        it('should create Command instance', () => {
            const cmd = Command.create('command', [1]);
            expect(cmd.command).to.be.equal('command');
            expect(cmd.args).to.eql([1]);
        });
        describe('command', () => {
            describe('is not specified', () => {
                it('should throw error', () => {
                    expect(Command.create.bind(Command)).to.throw(Error, 'Command is required');
                });
            });
            describe('is not string', () => {
                it('should throw error', () => {
                    expect(Command.create.bind(Command, {})).to.throw(Error, 'Command should be string');
                });
            });
        });
        describe('args', () => {
            describe('not specified', () => {
                it('should throw error', () => {
                    expect(Command.create.bind(Command, 'command')).to.throw(Error, 'Args required');
                });
            });
            describe('is not string', () => {
                it('should throw error', () => {
                    expect(Command.create.bind(Command, 'command', 12)).to.throw(Error, 'Args should be array');
                });
            });
        });
    });
    describe('fromBuffer', () => {
        it('should parse binary and create new command', () => {
            const buffer = Buffer.from(JSON.stringify({
                command: 'command',
                args: [1, 2]
            }));
            const cmd = Command.fromBuffer(buffer);

            expect(cmd.command).to.be.equal('command');
            expect(cmd.args).to.eql([1, 2]);
        });
    });
});
