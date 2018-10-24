const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const { expect } = chai;
const rpcModule = require('../../src');
const { AMQPRPCServer, AMQPRPCClient  } = rpcModule.getDriver('amqp');
const RABBITMQ_URI = 'amqp://localhost:5672';
describe('AMQP rpc', () => {
    let rpcClient;
    let rpcServer;
    beforeEach(async () => {
        rpcServer = AMQPRPCServer.create(RABBITMQ_URI);
        await rpcServer.start();

        rpcServer.addHandler('foo', (key) => {
            return {
                [key]: 'baz'
            }
        });
    });
    afterEach(async () => {
        await rpcClient.close();
        await rpcServer.close();
    });
    it('should send rpc and get response', async () => {
        rpcClient = AMQPRPCClient.create(RABBITMQ_URI);
        await rpcClient.start();
        const actual = await rpcClient.call('foo', 'bar');
        expect(actual).to.eql({
            bar: 'baz'
        });
    });

    describe('job throwed error', () => {
        beforeEach(async () => {
            rpcServer = AMQPRPCServer.create(RABBITMQ_URI);
            await rpcServer.start();

            rpcServer.addHandler('job-with-error', () => {
                throw new Error('Some error');
            });
            rpcClient = AMQPRPCClient.create(RABBITMQ_URI);
        });
        it('rpc.call should throw error', () => expect(
                rpcClient.call('job-with-error')
            ).to.be.rejectedWith(Error, 'Some error')
        );
    });
});
