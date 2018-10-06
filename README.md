# rpc-module
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
    await client.start();
    const result = await client.call('important', 'doing something');
    console.log(result);
}

main();

```
And you'll see:
```bash
About to create channel
About to init connection
About to create channel
About to init connection
"doing something" is very important
```
