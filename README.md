# rpc-module ![example workflow](https://github.com/Nazar910/rpc-module/actions/workflows/node.js.yml/badge.svg)
*Module that provide you with a possibility to communicate with other modules of your system via rpc*

## Getting started

### What is RPC?
RPC stands for "remote procedure call". Using such tool you can invoke function that is not part of your application. For example, you can make a call to another microservice if you're using such arhictecture.

### Usage
First you need to install it into your project:
```bash
npm i -S @nazar910/rpc-module
```
Decide what communication transport you need (at the moment it is only AMQP, but I'm gonna implement other transports):
- AMQP:
```bash
npm i -S amqplib
```


Now you can simply require and use it ([see also AMQP example in the tests](https://github.com/Nazar910/rpc-module/blob/master/test/integration/amqp.ispec.js)):
```javascript
const rpcModule = require('@nazar910/rpc-module');
const { AMQPRPCClient, AMQPRPCServer } = rpcModule.getDriver('amqp');

const RABBITMQ_URI = 'amqp://localhost:5672';
async function main() {
    const server = AMQPRPCServer.create(RABBITMQ_URI);
    await server.start();
    server.addHandler('important', (job) => `"${job}" is very important`);

    const client = AMQPRPCClient.create(RABBITMQ_URI);
    const result = await client.call('important', 'doing something');
    console.log(result);
}

main();

```

### API
1. rpcModule.getDriver(driverName: string)
Returns apropriate drivers (Server and Client) for specified driverName.
```javascript
const rpcModule = require('@nazar910/rpc-module');
const { AMQPRPCServer, AMQPRPCClient } = rpcModule.getDriver('amqp');
```
2. Drivers API

!Note: all driver have similar API for easy usage.

- `create(driverArgs)`

AMQPRPCServer and AMQPRPCClient have `create` factory method for getting instance of driver (`rpcServer` or `rpcClient`).
Example:
```javascript
const rpcModule = require('@nazar910/rpc-module');
const { AMQPRPCServer, AMQPRPCClient } = rpcModule.getDriver('amqp');
const RABBITMQ_URI = 'amqp://localhost:5672';
const rpcServer = AMQPRPCServer.create(RABBITMQ_URI);
const rpcClient = AMQPRPCClient.create(RABBITMQ_URI);
```

- `start()`

`rpcServer` and `rpcClient` have `start` method for ensuring connection. Required for server to start listening before registering handlers.
Example:
```javascript
// ...
async function () {
    await rpcServer.start();
    await rpcClient.start();
}
// ...
```
- `rpcServer.addHandler(command: string, job: Function)`

`rpcServer` has `addHandler` method for registering handlers.
Command is the name of rpc `procedure` and handler should be a function that returns Promise (or async function) and result will be sent to client.
!!!Note: it is important to call `rpcServer.start()` before registering handlers.
Example:
```javascript
// ...
async function handler(...args) {
    console.log('Args are', args);
    return args;
}
async function () {
    await rpcServer.addHandler('foo', handler);
}
// ...
```
- `rpcClient.call`

`rpcClient` has `call(command: string, arg1, arg2, ..., argn)` method for calling rpc.
Command is the name of rpc `procedure` and args are arguments to be passed to rpc.
Example:
```javascript
// ...
async function () {
    const result = await rpcClient.call('foo', 'bar');
    console.log('Result is', result);
}
// ...
```

- `rpcClient.sendRaw`

`rpcClient` has `sendRaw(queueName: string, data: object)` method for just sending msg to a queue.
Example:
```javascript
// ...
async function () {
    await rpcClient.sendRaw('some-queue', {foo: 'bar'});
}
// ...
```
