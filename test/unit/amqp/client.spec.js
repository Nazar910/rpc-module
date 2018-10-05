const { expect } = require('chai');
const sinon = require('sinon');
describe('AMQP - (RabbitMQ)', () => {
    const RABBITMQ_URI = 'amqp://localhost:5672';
    let sandbox;
    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });
    afterEach(() => {
        sandbox.restore();
    });
    describe('AMQPRPCClient', () => {
        describe('create', () => {
            const rcpModule = proxyquire('../../src');
            const { AMQPRPCClient } = rcpModule.getDriver('amqp');
            describe('when amqpUri is not speicified', () => {
                it('should fail', () => expect(
                    AMQPRPCClient.create.bind(
                        AMQPRPCClient, {}
                        )
                    ).to.throw(Error, 'amqpUri is required!'));
            });
        });
        describe('start', () => {
            const proxyquire = require('proxyquire');
            const rcpModule = proxyquire('../../src');
            const { AMQPRPCClient } = rcpModule.getDriver('amqp');
            it('should successfuly resolve', async () => {
                const amqpRpc = AMQPRPCClient.create({
                    amqpUri: RABBITMQ_URI
                });
                await amqpRpc.start();
            });
            describe('failed to create connection');
            describe('failed to create channel');
        });
    });
});
