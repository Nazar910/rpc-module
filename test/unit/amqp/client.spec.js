const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const { expect } = chai;
const sinon = require('sinon');
const rpcModule = require('../../../src');
const { AMQPRPCClient } = rpcModule.getDriver('amqp');
const Command = require('../../../src/command');
describe('AMQP - (RabbitMQ)', () => {
    const RABBITMQ_URI = 'amqp://localhost:5672';
    let sandbox;
    before(() => {
        sandbox = sinon.createSandbox();
    });
    afterEach(() => {
        if (sandbox) {
            sandbox.restore();
        }
    });
    describe('AMQPRCPClient', () => {
        describe('call', () => {
            let amqpRpc;
            let assertQueueStub;
            let sendToQueueSpy;
            let consumeSpy;
            let closeStub;
            let _waitForMsgWithCorrelationIdStub;
            let channelObj;
            let createChannelStub;
            beforeEach(() => {
                assertQueueStub = sandbox.stub().resolves({ queue: 'generated-name' });
                sendToQueueSpy = sandbox.spy();
                consumeSpy = sandbox.spy();
                closeStub = sandbox.stub().resolves();
                channelObj = {
                    assertQueue: assertQueueStub,
                    sendToQueue: sendToQueueSpy,
                    consume: consumeSpy,
                    close: closeStub
                }
                amqpRpc = AMQPRPCClient.create(RABBITMQ_URI);
                createChannelStub = sandbox.stub().resolves(channelObj);
                sandbox.stub(amqpRpc, '_getConnection')
                    .resolves({ createChannel: createChannelStub });
                _waitForMsgWithCorrelationIdStub = sandbox.stub(amqpRpc, '_waitForMsgWithCorrelationId')
                    .resolves({});
            });
            it('should assert queue', async () => {
                await amqpRpc.call('command');
                expect(assertQueueStub.callCount).to.be.equal(1);
                expect(assertQueueStub.firstCall.args).to.eql([
                    '',
                    {
                        exclusive: true
                    }
                ]);
            });
            it('should call createChannel', async () => {
                await amqpRpc.call('command');
                expect(createChannelStub.callCount).to.be.equal(1);
                expect(createChannelStub.firstCall.args).to.have.lengthOf(0);
            });
            it('should call channel.close', async () => {
                await amqpRpc.call('command');
                expect(closeStub.callCount).to.be.equal(1);
                expect(closeStub.firstCall.args).to.have.lengthOf(0);
            });
            it('should call _waitForMsgWithCorrelationIdStub', async () => {
                await amqpRpc.call('command');
                expect(_waitForMsgWithCorrelationIdStub.callCount).to.be.equal(1);
                expect(_waitForMsgWithCorrelationIdStub.firstCall.args).to.have.lengthOf(3);
                expect(_waitForMsgWithCorrelationIdStub.firstCall.args[0]).to.be.equal(channelObj);
                expect(_waitForMsgWithCorrelationIdStub.firstCall.args[1]).to.be.equal('generated-name');
            });
            describe('_waitForMsgWithCorrelationId rejects', () => {
                it('should reject', () => {
                    amqpRpc = AMQPRPCClient.create(RABBITMQ_URI);
                    sandbox.stub(amqpRpc, '_waitForMsgWithCorrelationId').rejects();
                    expect(amqpRpc.call('command')).to.be.rejected;
                });
            });
            it('should call sendToQueue', async () => {
                await amqpRpc.call('command');
                expect(sendToQueueSpy.callCount).to.be.equal(1);
                expect(sendToQueueSpy.firstCall.args).to.have.lengthOf(3);
                expect(sendToQueueSpy.firstCall.args[0]).to.be.equal('command');
                expect(sendToQueueSpy.firstCall.args[1])
                    .to.eql(Command.create('command', []).pack());
                expect(sendToQueueSpy.firstCall.args[2].replyTo).to.be.equal('generated-name');
            });
            describe('no command specified', () => {
                it('should reject', () => expect(
                    amqpRpc.call()).to.be.rejectedWith(Error, 'Command is required')
                );
            });
        });
        describe('sendRaw', () => {
            let amqpRpc;
            let sendToQueueSpy;
            beforeEach(() => {
                sendToQueueSpy = sandbox.spy();
                const channelObj = {
                    sendToQueue: sendToQueueSpy
                }
                amqpRpc = AMQPRPCClient.create(RABBITMQ_URI);
                sandbox.stub(amqpRpc, 'channel')
                    .get(() => channelObj);
            });
            it('should call sendToQueue', async () => {
                await amqpRpc.sendRaw('queue123', { foo: 'bar' });
                expect(sendToQueueSpy.callCount).to.be.equal(1);
                expect(sendToQueueSpy.firstCall.args).to.have.lengthOf(2);
                expect(sendToQueueSpy.firstCall.args[0]).to.be.equal('queue123');
                expect(sendToQueueSpy.firstCall.args[1])
                    .to.eql(Buffer.from(JSON.stringify({ foo: 'bar' })));
            });
        });
    });
});
