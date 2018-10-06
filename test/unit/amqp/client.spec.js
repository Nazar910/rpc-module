const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const { expect } = chai;
const sinon = require('sinon');
const rpcModule = require('../../../src');
const { AMQPRPCClient } = rpcModule.getDriver('amqp');
const CommadResult = require('../../../src/command-result');
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
        describe('_onMessage', () => {
            let ackSpy;
            let rejectSpy;
            let amqpRpc;

            const msg = {
                properties: {
                    correlationId: '1234'
                },
                content: Buffer.from('{"foo":"bar"}')
            }
            beforeEach(() => {
                rejectSpy = sandbox.spy();
                ackSpy = sandbox.spy();
                channelObj = {
                    reject: rejectSpy,
                    ack: ackSpy
                }
                amqpRpc = AMQPRPCClient.create(RABBITMQ_URI);
                sandbox
                    .stub(amqpRpc, 'channel')
                    .get(() => channelObj);
                sandbox
                    .stub(amqpRpc, 'correlationIds')
                    .get(() => new Set());
            });
            it('should call ch.reject', () => {
                amqpRpc._onMessage(msg);
                expect(rejectSpy.callCount).to.be.equal(1);
                expect(rejectSpy.firstCall.args).to.eql([msg]);
            });
            it('should not call ack', () => {
                amqpRpc._onMessage(msg);
                expect(ackSpy.callCount).to.be.equal(0);
            });
            describe('correlationIds has msg.correlationId', () => {
                let correlationIdsSet;
                beforeEach(() => {
                    correlationIdsSet = new Set(['1234']);
                    sandbox
                        .stub(amqpRpc, 'correlationIds')
                        .get(() => correlationIdsSet);
                });
                it('should ack msg', () => {
                    amqpRpc._onMessage(msg);
                    expect(ackSpy.callCount).to.be.equal(1);
                    expect(ackSpy.firstCall.args).to.eql([msg]);
                });
                it('should delete correlationId', () => {
                    amqpRpc._onMessage(msg);
                    expect([...correlationIdsSet]).to.not.include(['1234']);
                });
                it('should emit reply-corr_id event with command obj',
                () => new Promise(resolve => {
                        amqpRpc.emitter.on('reply-1234', (cmdRes) => {
                            expect(cmdRes).to.eql(CommadResult.create({ foo: 'bar' }));
                            resolve();
                        })
                        amqpRpc._onMessage(msg);
                    })
                );
                it('should not call ch.reject', () => {
                    amqpRpc._onMessage(msg);
                    expect(rejectSpy.callCount).to.be.equal(0);
                });
            });
        });
    });
    describe('_waitForReply', () => {
        let consumeSpy;
        let amqpRpc;
        beforeEach(() => {
            amqpRpc = AMQPRPCClient.create(RABBITMQ_URI);
            consumeSpy = sandbox.spy();
            sandbox.stub(amqpRpc, 'channel')
                .get(() => ({
                    consume: consumeSpy
                }));
        });
        describe('event received', () => {
            describe('and correlation id equal to expected one', () => {
                it('should resolve', () => {
                    const promise = amqpRpc._waitForReply('reply-to', '1234');
                    amqpRpc.emitter.emit('reply-1234', {});
                    expect(promise).to.be.fulfilled;
                    expect(consumeSpy.callCount).to.be.equal(1);
                    expect(consumeSpy.firstCall.args).to.have.lengthOf(2);
                    expect(consumeSpy.firstCall.args[0]).to.be.equal('reply-to');
                });
            });
        });
    });
    describe('call', () => {
        it('should save correlation id');
    });
});
