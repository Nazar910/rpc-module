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
    describe('AMQPRPCServer', () => {
        describe('addHandler', () => {
            let amqpRpc;
            let channelStub;
            beforeEach(() => {
                amqpRpc = AMQPRPCServer.create(RABBITMQ_URI);

                sandbox.stub(amqpRpc, '_initChannel').resolves(channelStub);
                await amqpRpc.start();
            });
            it('should create queue', async () => {

            });
            xdescribe('new message is in the queue', () => {
                it('should execute job and reply with result and corr id from msg');
                xdescribe('job failed');
            })
        });
    });
});
