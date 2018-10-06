const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const { expect } = chai;
const sinon = require('sinon');
const rcpModule = require('../../../src');
const { AMQPRPCServer } = rcpModule.getDriver('amqp');
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
            let amqpRpc;
            beforeEach(() => {
                assertQueueStub = sandbox.stub().resolves();
                consumeStub = sandbox.stub();
                sendToQueueStub = sandbox.stub();
                const channelStub = {
                    assertQueue: assertQueueStub,
                    consume: consumeStub,
                    sendToQueue: sendToQueueStub
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
                consumeStub.firstCall.args[1](msg);
                expect(sendToQueueStub.callCount).to.be.equal(1);
                expect(sendToQueueStub.firstCall.args).to.deep.equal([
                    'reply-to',
                    {},
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
    });
});
