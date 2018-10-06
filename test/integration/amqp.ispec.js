const { expect } = require('chai');
const rpcModule = require('../../src');
const { AMQPRPCServer, AMQPRPCClient  } = rpcModule.getDriver('amqp');
const RABBITMQ_URI = 'amqp://localhost:5672';
describe('AMQP rpc', () => {
    beforeEach(async () => {
        const rpcServer = AMQPRPCServer.create(RABBITMQ_URI);
        await rpcServer.start();

        rpcServer.addHandler('foo', (key) => {
            return {
                [key]: 'baz'
            }
        });
    });
    it('should send rpc and get response', async () => {
        const rpcClient = AMQPRPCClient.create(RABBITMQ_URI);
        await rpcClient.start();
        const actual = await rpcClient.call('foo', 'bar');
        expect(actual).to.eql({
            bar: 'baz'
        });
    });
});
