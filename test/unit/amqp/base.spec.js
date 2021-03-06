const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const { expect } = chai;
const sinon = require('sinon');
const rcpModule = require('../../../src');
const AMQPDrivers = rcpModule.getDriver('amqp');
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
    for (const driver of ['AMQPRPCServer', 'AMQPRPCClient']) {
        const driverImpl = AMQPDrivers[driver];
        describe(driver, () => {
            describe('create', () => {
                describe('when amqpUri is not speicified', () => {
                    it('should fail', () => expect(
                        driverImpl.create.bind(driverImpl)
                    ).to.throw(Error, 'amqpUri is required!'));
                });
                describe('when amqpUri is not string', () => {
                    it('should fail', () => expect(
                        driverImpl.create.bind(driverImpl, {})
                    ).to.throw(Error, 'amqpUri should be string'));
                });
            });
            describe('_createConnection', () => {
                let expectedConnection;
                let connectStub;

                beforeEach(() => {
                    expectedConnection = {
                        createChannel: () => ({})
                    };
                    const amqp = require('amqplib');
                    connectStub = sandbox.stub(amqp, 'connect').resolves(expectedConnection);
                });
                it('should pass', async () => {
                    const amqpRpc = driverImpl.create(RABBITMQ_URI);
                    await amqpRpc._createConnection();
                });
                it('should return amqp connection', async () => {
                    const amqpRpc = driverImpl.create(RABBITMQ_URI);
                    const conn = await amqpRpc._createConnection();
                    expect(connectStub.callCount).to.be.equal(1);
                    expect(connectStub.firstCall.args).to.have.lengthOf(1);
                    expect(connectStub.firstCall.args[0]).to.be.equal(RABBITMQ_URI);
                    expect(conn).to.be.equal(expectedConnection);
                });
            });
            describe('_getConnection', () => {
                let expectedConnection;
                let amqpRpc;
                let createConnectionStub;

                beforeEach(() => {
                    expectedConnection = {
                        createChannel: () => ({})
                    };
                    amqpRpc = driverImpl.create(RABBITMQ_URI);
                    createConnectionStub = sandbox
                        .stub(amqpRpc, '_createConnection')
                        .resolves(expectedConnection);
                });
                it('should return amqp connection', async () => {
                    const conn = await amqpRpc._getConnection();
                    expect(createConnectionStub.callCount).to.be.equal(1);
                    expect(createConnectionStub.firstCall.args).to.have.lengthOf(0);
                    expect(conn).to.be.equal(expectedConnection);
                });
                describe('connection is already present', () => {
                    it('should not call _createConnection and just return connection', async () => {
                        await amqpRpc._getConnection();
                        const conn = await amqpRpc._getConnection();
                        expect(createConnectionStub.callCount).to.be.equal(1);
                        expect(conn).to.be.equal(expectedConnection);
                    });
                });
            });
            describe('_initChannel', () => {
                let getConnectionStub;
                let createChannelSpy;
                const channelObj = {};
                let amqpRpc;
                beforeEach(() => {
                    amqpRpc = driverImpl.create(RABBITMQ_URI);
                    createChannelSpy = sandbox.stub().resolves(channelObj);
                    getConnectionStub = sandbox.stub(amqpRpc, '_getConnection').resolves({
                        createChannel: createChannelSpy
                    });
                });
                it('should return channel object', async () => {
                    await amqpRpc._initChannel();
                    expect(amqpRpc.channel).to.be.equal(channelObj);
                });
                it('should call _getConnection', async () => {
                    await amqpRpc._initChannel();
                    expect(getConnectionStub.callCount).to.be.equal(1);
                    expect(getConnectionStub.firstCall.args).to.have.lengthOf(0);
                });
                it('should call createChannel', async () => {
                    await amqpRpc._initChannel();
                    expect(createChannelSpy.callCount).to.be.equal(1);
                    expect(createChannelSpy.firstCall.args).to.have.lengthOf(0);
                });
                describe('called twice', () => {
                    it('should call getConnection only once', async () => {
                        await amqpRpc._initChannel();
                        await amqpRpc._initChannel();
                        expect(getConnectionStub.callCount).to.be.equal(1);
                    });
                    it('should call createChannel only once', async () => {
                        await amqpRpc._initChannel();
                        await amqpRpc._initChannel();
                        expect(createChannelSpy.callCount).to.be.equal(1);
                    });
                });
                describe('_getConnection rejects', () => {
                    let amqpRpc;
                    beforeEach(() => {
                        amqpRpc = driverImpl.create(RABBITMQ_URI);
                        getConnectionStub = sandbox.stub(amqpRpc, '_getConnection').rejects(new Error('get connection error'));
                    });
                    it('should reject', () => expect(
                        amqpRpc._initChannel()
                    ).to.be.rejectedWith(Error, 'get connection error')
                    );
                });
                describe('createChannel rejects', () => {
                    let amqpRpc;
                    beforeEach(() => {
                        amqpRpc = driverImpl.create(RABBITMQ_URI);
                        createChannelSpy = sandbox.stub().rejects(new Error('init channel error'));
                        getConnectionStub = sandbox.stub(amqpRpc, '_getConnection').resolves({
                            createChannel: createChannelSpy
                        });
                    });
                    it('should reject', () => expect(
                        amqpRpc._initChannel()
                    ).to.be.rejectedWith(Error, 'init channel error')
                    );
                });
            });
            describe('start', () => {
                it('should call _initChannel', async () => {
                    const amqpRpc = driverImpl.create(RABBITMQ_URI);
                    const initChannelStub = sandbox.stub(amqpRpc, '_initChannel').resolves({});
                    await amqpRpc.start();

                    expect(initChannelStub.callCount).to.be.equal(1);
                    expect(initChannelStub.firstCall.args).to.have.lengthOf(0);
                });
            });
            describe('_closeChannel', () => {
                let amqpRpc;
                let channelCloseStub;
                beforeEach(() => {
                    amqpRpc = driverImpl.create(RABBITMQ_URI);
                    channelCloseStub = sandbox.stub().resolves();
                    sandbox.stub(amqpRpc, 'channel')
                        .get(() => ({
                            close: channelCloseStub
                        }));
                });
                it('should call channel close', async () => {
                    await amqpRpc._closeChannel();
                    expect(channelCloseStub.callCount).to.be.equal(1);
                    expect(channelCloseStub.firstCall.args).to.have.lengthOf(0);
                })
                describe('no channel present', () => {
                    beforeEach(() => {
                        amqpRpc = driverImpl.create(RABBITMQ_URI);
                    });
                    it('should just pass', async () => {
                        await amqpRpc._closeChannel();
                    });
                });
                describe('channel.close rejects', () => {
                    beforeEach(() => {
                        amqpRpc = driverImpl.create(RABBITMQ_URI);
                        channelCloseStub = sandbox.stub().rejects(new Error('Error from channel.close'));
                        sandbox.stub(amqpRpc, 'channel')
                            .get(() => ({
                                close: channelCloseStub
                            }));
                    });
                    it('should reject', () =>
                        expect(
                            amqpRpc._closeChannel()
                        ).to.be.rejectedWith(Error, 'Error from channel.close')
                    );
                });
            });
            describe('_closeConnection', () => {
                let amqpRpc;
                let connectionCloseStub;
                beforeEach(() => {
                    amqpRpc = driverImpl.create(RABBITMQ_URI);
                    connectionCloseStub = sandbox.stub().resolves();
                    sandbox.stub(amqpRpc, 'connection')
                        .get(() => ({
                            close: connectionCloseStub
                        }));
                });
                it('should call connection.close', async () => {
                    await amqpRpc._closeConnection();
                    expect(connectionCloseStub.callCount).to.be.equal(1);
                    expect(connectionCloseStub.firstCall.args).to.have.lengthOf(0);
                });
                describe('no connection object', () => {
                    beforeEach(() => {
                        amqpRpc = driverImpl.create(RABBITMQ_URI);
                    });
                    it('should just pass', () => amqpRpc._closeConnection());
                });
            });
            describe('close', () => {
                let amqpRpc;
                let closeChannelStub;
                let closeConnectionStub;
                beforeEach(() => {
                    amqpRpc = driverImpl.create(RABBITMQ_URI);
                    closeChannelStub = sandbox.stub(amqpRpc, '_closeChannel')
                        .resolves();
                    closeConnectionStub = sandbox.stub(amqpRpc, '_closeConnection')
                        .resolves();
                });
                it('should call _closeChannel', async () => {
                    await amqpRpc.close();
                    expect(closeChannelStub.callCount).to.be.equal(1);
                    expect(closeChannelStub.firstCall.args).to.have.lengthOf(0);
                });
                it('should call _closeChannel', async () => {
                    await amqpRpc.close();
                    expect(closeConnectionStub.callCount).to.be.equal(1);
                    expect(closeConnectionStub.firstCall.args).to.have.lengthOf(0);
                });
            });
        });

    }
});
