const { expect } = require('chai');
describe('AMQP - (RabbitMQ)', () => {
    const { AMQPRPCClient, AMQPRPCServer } = require('../../../src').getDriver('amqp');
    const RABBITMQ_URI = 'amqp://localhost:5672';
    describe('AMQPRPCClient', () => {
        describe('create', () => {
            describe('when amqpUri is not speicified', () => {
                it('should fail', () => expect(
                    AMQPRPCClient.create.bind(
                        AMQPRPCClient, {}
                    )
                ).to.throw(Error, 'amqpUri is required!'));
            });
        });
        describe('start', () => {
            it('should successfuly resolve', async () => {
                const amqpRpc = AMQPRPCClient.create({
                    amqpUri: RABBITMQ_URI
                });
                await amqpRpc.start();
            });
        });
    });
    describe('AMQPRPCServer', () => {
        describe('create', () => {
            describe('when amqpUri is not speicified', () => {
                it('should fail', () => expect(
                    AMQPRPCClient.create.bind(
                        AMQPRPCClient, {}
                    )
                ).to.throw(Error, 'amqpUri is required!'));
            });
        });
        describe('start', () => {
            it('should successfuly resolve', async () => {
                const amqpRpc = AMQPRPCServer.create({
                    amqpUri: RABBITMQ_URI
                });
                await amqpRpc.start();
            });
        });
        describe('addHandler', () => {
            it('should create a queue and consume it', async () => {

            });
            describe('new message is in the queue', () => {
                it('should execute job and reply with result and corr id');
                describe('job failed');
            })
        });
    });
});
