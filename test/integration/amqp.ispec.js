const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const { expect } = chai;
const rpcModule = require('../../src');
const { AMQPRPCServer, AMQPRPCClient  } = rpcModule.getDriver('amqp');
const RABBITMQ_URI = 'amqp://localhost:5672';
const amqp = require('amqplib');
describe('AMQP rpc', () => {
    let rpcClient;
    let rpcServer;
    beforeEach(async () => {
        rpcServer = AMQPRPCServer.create(RABBITMQ_URI);
        await rpcServer.start();

        rpcServer.addHandler('foo', (key) => ({
                [key]: 'baz'
        }));
        rpcClient = AMQPRPCClient.create(RABBITMQ_URI);
        await rpcClient.start();
    });
    afterEach(async () => {
        await rpcClient.close();
        await rpcServer.close();
    });
    it('should send rpc and get response', async () => {
        const actual = await rpcClient.call('foo', 'bar');
        expect(actual).to.eql({
            bar: 'baz'
        });
    });

    describe('job throwed error', () => {
        beforeEach(async () => {
            rpcServer.addHandler('job-with-error', () => {
                throw new Error('Some error');
            });
        });
        it('rpc.call should throw error', () => expect(
                rpcClient.call('job-with-error')
            ).to.be.rejectedWith(Error, 'Some error')
        );
    });

    describe('simultaneously 15 rpcClient.call', () => {
        it('should pass', () => Promise.all(
            new Array(15).fill().map(async (e, i) => {
                const result = await rpcClient.call('foo', i);
                expect(result).to.eql({
                    [i]: 'baz'
                });
            }))
        );
    });

    describe('sendRaw', () => {
        const queue = 'some-queue';
        const data = {
            foo: 'bar'
        };
        let ch;
        let conn;
        beforeEach(async () => {
            conn = await amqp.connect(RABBITMQ_URI);
            ch = await conn.createChannel();
            await ch.assertQueue(queue);
            await ch.purgeQueue(queue);
        });
        afterEach(async () => {
            await conn.close();
        });
        it('should send raw data to queue', (done) => {
            ch.consume(queue, async (msg) => {
                const body = JSON.parse(msg.content.toString());
                expect(body).to.eql(data);
                ch.ack(msg);
                await ch.close();
                done();
            });

            rpcClient.sendRaw(queue, data);
        });
    });

    describe('addNoReplyHandler', () => {
        const queue = 'add-no-reply-handler-some-queue';
        const data = {
            foo: 'bar'
        };
        it('should consume raw data from queue', (done) => {
            rpcServer.addNoReplyHandler(queue, (arg) => {
                expect(arg).to.eql(data);
                done();
            }).then(() => rpcClient.sendRaw(queue, data));
        });
    });
});
