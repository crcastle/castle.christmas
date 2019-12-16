
const DEVICE = "e0:e5:cf:5c:5b:d3";
const ON_COMMAND = new Uint8Array([0x0f, 0x06, 0x03, 0x00, 0x01, 0x00, 0x00, 0x05, 0xff, 0xff]);
const OFF_COMMAND = new Uint8Array([0x0f, 0x06, 0x03, 0x00, 0x00, 0x00, 0x00, 0x04, 0xff, 0xff]);
const OFF_DELAY = 3600000;
const POWER_ON = 1;
const POWER_OFF = 0;
const MAX_ERRORS = 3;
let powerState = POWER_OFF;
let command;
let device;
let errors = 0;

setWatch(function() {
  console.log("Pressed");

  let timer;
  if (powerState == POWER_ON) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    return turnOutletOff().then(function() {
      console.log(`Finished. Current state is ${powerState ? 'ON' : 'OFF'}`);
      console.log(" ");
    });
  } else {
    return turnOutletOn().then(function() {
      console.log(`Scheduling turn off in ${OFF_DELAY / 60000} minutes`);
      timer = setTimeout(function() {
        turnOutletOff();
      }, OFF_DELAY);
    }).then(function() {
      console.log(`Finished. Current state is ${powerState ? 'ON' : 'OFF'}`);
      console.log(" ");
    });
  }
}, BTN, {edge:"falling", debounce:50, repeat:true});


function turnOutletOn() {
  console.log("Turning outlet on");
  return sendCommand(ON_COMMAND).then(function() {
    powerState = POWER_ON;
  });
}

function turnOutletOff() {
  console.log("Turning outlet off");
  return sendCommand(OFF_COMMAND).then(function() {
    powerState = POWER_OFF;
  });
}

function sendCommand(requestedCommand) {
  command = requestedCommand;

  errors = 0;
  return NRF.connect(DEVICE)
    .then(function(connection) {
      console.log("1. Connected");
      device = connection;
      return getService(connection);
    })
    .then(getCharacteristic)
    .then(writeValue)
    .then(disconnect)
    .catch(function(err) {
      console.log("===> Error:", err);
  });
}

function getService(connection) {
  return connection.getPrimaryService(0xfff0)
    .then(function(service) {
      console.log("2. Got service");
      return service;
    })
    .catch(function(err) {
      disconnect();
      errors += 1;
      console.log(`===> Error ${errors} getting primary service:`, err);
      if (errors >= MAX_ERRORS) {
        throw new Error(err);
      }
      return NRF.connect(DEVICE)
        .then(function(connection) {
          device = connection;
          return getService(connection);
      });
    });
}

function getCharacteristic(service) {
  return service.getCharacteristic(0xfff3)
    .then(function(characteristic) {
      console.log("3. Got characteristic");
      return characteristic;
    })
    .catch(function(err) {
      console.log("===> Error getting characteristic:", err);
      throw new Error(err);
  });
}

function writeValue(characteristic) {
  return characteristic.writeValue(command)
    .then(function() {
      console.log("4. Wrote value");
    })
    .catch(function(err) {
      console.log("===> Error writing value:", err);
      throw new Error(err);
  });
}

function disconnect() {
  return device.disconnect()
    .then(function() {
      device = null;
      console.log("5. Disconnected");
    })
    .catch(function(err) {
      console.log("===> Error disconnecting:", err);
      throw new Error(err);
  });
}