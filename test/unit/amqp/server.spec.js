const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const { expect } = chai;
const sinon = require('sinon');
const rpcModule = require('../../../src');
const { AMQPRPCServer } = rpcModule.getDriver('amqp');
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
    describe('AMQPRCPServer', () => {
        describe('addHandler', () => {
            let assertQueueStub;
            let consumeStub;
            let sendToQueueStub;
            let ackStub;
            let amqpRpc;
            beforeEach(() => {
                assertQueueStub = sandbox.stub().resolves();
                consumeStub = sandbox.stub();
                sendToQueueStub = sandbox.stub();
                ackStub = sandbox.stub();
                const channelStub = {
                    assertQueue: assertQueueStub,
                    consume: consumeStub,
                    sendToQueue: sendToQueueStub,
                    ack: ackStub
                };
                amqpRpc = AMQPRPCServer.create(RABBITMQ_URI);
                sandbox.stub(amqpRpc, 'channel').get(() => channelStub);
            });
            it('should call assertqueue', async () => {
                await amqpRpc.addHandler('command', () => ({}));

                expect(assertQueueStub.callCount).to.be.equal(1);
                expect(assertQueueStub.firstCall.args).to.deep.equal(['command']);
            });
            it('should call consume', async () => {
                await amqpRpc.addHandler('command', () => ({}));

                expect(consumeStub.callCount).to.be.equal(1);
                expect(consumeStub.firstCall.args).to.have.lengthOf(2);
                expect(consumeStub.firstCall.args[0]).to.be.equal('command');
                expect(consumeStub.firstCall.args[1]).to.a('function');
            });
            it('should call sendToQueue', async () => {
                await amqpRpc.addHandler('command', () => ({}));
                const msg = {
                    properties: {
                        replyTo: 'reply-to',
                        correlationId: '1234'
                    },
                    content: Buffer.from(JSON.stringify({
                        command: 'command',
                        args: [1]
                    }))
                }
                const [,func] = consumeStub.firstCall.args;
                await func(msg);
                expect(sendToQueueStub.callCount).to.be.equal(1);
                expect(sendToQueueStub.firstCall.args).to.eql([
                    'reply-to',
                    Buffer.from('{}'),
                    {
                        correlationId: '1234'
                    }
                ]);
            });
            describe('command', () => {
                describe('is not specified', () => {
                    it('should reject', () => expect(
                        amqpRpc.addHandler()
                    ).to.be.rejectedWith(Error, 'Command is required')
                    )
                });
                describe('is not string', () => {
                    it('should reject', () => expect(
                        amqpRpc.addHandler({})
                    ).to.be.rejectedWith(Error, 'Command should be string')
                    )
                });
            });
            describe('job', () => {
                describe('is not specified', () => {
                    it('should reject', () => expect(
                        amqpRpc.addHandler('command')
                    ).to.be.rejectedWith(Error, 'Job is required')
                    )
                });
                describe('is not a function', () => {
                    it('should reject', () => expect(
                        amqpRpc.addHandler('command', {})
                    ).to.be.rejectedWith(Error, 'Job should be a function')
                    )
                });
            });
            describe('no channel is specified', () => {
                beforeEach(() => {
                    amqpRpc = AMQPRPCServer.create(RABBITMQ_URI);
                });
                it('should fail', () => expect(
                        amqpRpc.addHandler('some-handler', () => ({}))
                ).to.be.rejectedWith(Error, 'No channel, you should call start() before')
                )
            });
        });
        describe('addNoReplyHandler', () => {
            let assertQueueStub;
            let consumeStub;
            let sendToQueueStub;
            let ackStub;
            let rejectStub;
            let amqpRpc;
            beforeEach(() => {
                assertQueueStub = sandbox.stub().resolves();
                consumeStub = sandbox.stub();
                ackStub = sandbox.stub();
                rejectStub = sandbox.stub();
                const channelStub = {
                    assertQueue: assertQueueStub,
                    consume: consumeStub,
                    ack: ackStub,
                    reject: rejectStub
                };
                amqpRpc = AMQPRPCServer.create(RABBITMQ_URI);
                sandbox.stub(amqpRpc, 'channel').get(() => channelStub);
            });
            it('should call assertqueue', async () => {
                await amqpRpc.addNoReplyHandler('command', () => ({}));

                expect(assertQueueStub.callCount).to.be.equal(1);
                expect(assertQueueStub.firstCall.args).to.deep.equal(['command']);
            });
            it('should call consume', async () => {
                await amqpRpc.addNoReplyHandler('command', () => ({}));

                expect(consumeStub.callCount).to.be.equal(1);
                expect(consumeStub.firstCall.args).to.have.lengthOf(2);
                expect(consumeStub.firstCall.args[0]).to.be.equal('command');
                expect(consumeStub.firstCall.args[1]).to.a('function');
            });
            it('should ack msg', async () => {
                await amqpRpc.addNoReplyHandler('command', () => ({}));
                const msg = {
                    content: Buffer.from(JSON.stringify({
                        command: 'command',
                        args: [1]
                    }))
                }
                const [,func] = consumeStub.firstCall.args;
                await func(msg);
                expect(ackStub.called).to.be.true;
                expect(ackStub.callCount).to.be.equal(1);
                expect(ackStub.firstCall.args).to.have.lengthOf(1);
                expect(ackStub.firstCall.args[0]).to.eql(msg);
            });
            describe('handler rejects', () => {
                it('should reject msg', async () => {
                    await amqpRpc.addNoReplyHandler(
                        'command',
                        () => Promise.reject(new Error())
                    );
                    const msg = {
                        content: Buffer.from(JSON.stringify({
                            command: 'command',
                            args: [1]
                        }))
                    }
                    const [,func] = consumeStub.firstCall.args;
                    await func(msg);
                    expect(rejectStub.called).to.be.true;
                    expect(rejectStub.callCount).to.be.equal(1);
                    expect(rejectStub.firstCall.args).to.have.lengthOf(1);
                    expect(rejectStub.firstCall.args[0]).to.eql(msg);
                });
            });
            describe('command', () => {
                describe('is not specified', () => {
                    it('should reject', () => expect(
                        amqpRpc.addNoReplyHandler()
                    ).to.be.rejectedWith(Error, 'Command is required')
                    )
                });
                describe('is not string', () => {
                    it('should reject', () => expect(
                        amqpRpc.addNoReplyHandler({})
                    ).to.be.rejectedWith(Error, 'Command should be string')
                    )
                });
            });
            describe('job', () => {
                describe('is not specified', () => {
                    it('should reject', () => expect(
                        amqpRpc.addNoReplyHandler('command')
                    ).to.be.rejectedWith(Error, 'Job is required')
                    )
                });
                describe('is not a function', () => {
                    it('should reject', () => expect(
                        amqpRpc.addNoReplyHandler('command', {})
                    ).to.be.rejectedWith(Error, 'Job should be a function')
                    )
                });
            });
            describe('no channel is specified', () => {
                beforeEach(() => {
                    amqpRpc = AMQPRPCServer.create(RABBITMQ_URI);
                });
                it('should fail', () => expect(
                        amqpRpc.addNoReplyHandler('some-handler', () => ({}))
                ).to.be.rejectedWith(Error, 'No channel, you should call start() before')
                );
            });
        });
    });
});
