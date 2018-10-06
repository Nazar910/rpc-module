const CommandResult = require('../../src/command-result');
const { expect } = require('chai');
describe('Command', () => {
    describe('create', () => {
        describe('data', () => {
            it('should create CommandResult instance', () => {
                const cmdRes = CommandResult.create({foo: 'bar'});
                expect(cmdRes.data).to.eql({foo: 'bar'});
            });
            describe('is not specified', () => {
                it('should throw error', () => {
                    expect(CommandResult.create.bind(CommandResult)).to.throw(Error, 'Data required');
                });
            });
        });
    });
    describe('pack', () => {
        it('should pack CommandResult into buffer', () => {
            const cmdRes = CommandResult.create({ foo: 'bar' });
            const buff = cmdRes.pack();

            const expectedBuff = Buffer.from(JSON.stringify({
                foo: 'bar'
            }));
            expect(buff).to.be.eql(expectedBuff);
            const buffRes = JSON.parse(buff.toString());
            expect(buffRes).to.eql({foo: 'bar'});
        });
    });
    describe('fromBuffer', () => {
        it('should parse binary and create new command-result', () => {
            const buffer = Buffer.from(JSON.stringify({foo:'bar'}));
            const cmdRes = CommandResult.fromBuffer(buffer);
            expect(cmdRes.data).to.eql({foo: 'bar'});
        });
    });
});
