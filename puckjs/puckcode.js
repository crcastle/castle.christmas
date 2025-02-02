
const DEVICE = "e0:e5:cf:5c:5b:d3";
const ON_COMMAND = new Uint8Array([0x0f, 0x06, 0x03, 0x00, 0x01, 0x00, 0x00, 0x05, 0xff, 0xff]);
const OFF_COMMAND = new Uint8Array([0x0f, 0x06, 0x03, 0x00, 0x00, 0x00, 0x00, 0x04, 0xff, 0xff]);
const OFF_DELAY = 60 * 60 * 1000;
const POWER_ON = 1;
const POWER_OFF = 0;
const MAX_ERRORS = 3;
const RED   = LED1;
const GREEN = LED2;
const BLUE  = LED3;

let buttonStates = {
  WORKING: 'working',
  LISTENING: 'listening'
};

let powerStates = {
  ON: 'on',
  OFF: 'off'
};

let powerState = powerStates.OFF;
let buttonState = buttonStates.LISTENING;
let command;
let device;
let errors = 0;

NRF.nfcURL("https://castle.christmas");
console.log(`Battery: ${Puck.getBatteryPercentage()}%`);
console.log("Memory:", process.memory());

setWatch(function() {
  console.log("Pressed");

  if (buttonState == buttonStates.WORKING) return;

  buttonState = buttonStates.WORKING;

  clearTimeout();
  //slowCycle();
  //setTimeout(() => fastCycle(), 750*3);
  //setTimeout(() => fastCycle(), 750*3);
  //setTimeout(() => fastCycle(), 750*3 + 200*3);

  if (powerState == powerStates.ON) {

    turnOutletOff().then(function() {
      console.log(`Finished. Current state is ${powerState ? 'on' : 'off'}`);
      console.log(" ");
      buttonState = buttonStates.LISTENING;
    }).catch(function(err) {
      console.log("===> Error turning outlet off:", err);
    });

  } else {

    turnOutletOn().then(function() {
      console.log(`Scheduling turn off in ${OFF_DELAY / 60000} minutes`);
      timer = setTimeout(function() {
        turnOutletOff();
      }, OFF_DELAY);
    }).then(function() {
      console.log(`Finished. Current state is ${powerState ? 'on' : 'off'}`);
      console.log(" ");
      buttonState = buttonStates.LISTENING;
    }).catch(function(err) {
      console.log("===> Error turning outlet on:", err);
    });

  }
}, BTN, {edge:"falling", debounce:250, repeat:true});


function turnOutletOn() {
  console.log("Turning outlet on");
  return sendCommand(ON_COMMAND).then(function() {
    powerState = powerStates.ON;
  });
}

function turnOutletOff() {
  console.log("Turning outlet off");
  return sendCommand(OFF_COMMAND).then(function() {
    powerState = powerStates.OFF;
  });
}

// Send command to BLE device
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
      console.log("===> Error sending command", err);
      throw err;
  });
}

// Get specified BLE Primary Service using BLE connection
function getService(connection) {
  return connection.getPrimaryService(0xfff0)
    .then(function(service) {
      console.log("2. Got service");
      return service;
    })
    .catch(function(err) {
      disconnect();
      errors += 1;
      console.log(`===> Error ${errors} errors getting primary service:`, err);
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

// Get specified BLE characteristic using BLE primary service
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

// Write a value to specified BLE characteristic
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

// Disconnect from BLE device
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

/*
 *
 * LED functions
 *
 */

function allOff() {
  digitalWrite([LED3,LED2,LED1], 0);
}

function allOn() {
  digitalWrite([LED3,LED2,LED1], 7);
}

function slowCycle() {
  allOff();
  digitalWrite([GREEN,RED,BLUE], 1);
  setTimeout(() => digitalWrite([GREEN,RED,BLUE], 2), 750*1);
  setTimeout(() => digitalWrite([GREEN,RED,BLUE], 4), 750*2);
}

function fastCycle() {
  allOff();
  digitalWrite([GREEN,RED,BLUE], 1);
  setTimeout(() => digitalWrite([GREEN,RED,BLUE], 2), 200*1);
  setTimeout(() => digitalWrite([GREEN,RED,BLUE], 4), 200*2);
}