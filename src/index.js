const AMQPDrivers = require('./amqp');
const drivers = new Map();
drivers.set('amqp', AMQPDrivers);

function getDriver(name) {
    assert.ok(name, 'driver name is required');
    assert.ok(drivers.has(name), 'Unknown driver name');

    return drivers.get(name);
}

module.exports = {
    getDriver
};
