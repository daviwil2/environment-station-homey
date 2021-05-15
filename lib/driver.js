// ./lib/driver.js used by the driver.js files

'use strict';

const Homey               = require('homey');
const mqtt                = require('mqtt');
const { ManagerSettings } = require('homey'); // get the ManagerSettings object which gives access to the methods to read and write settings

// create a settings object to store the connection information to the MQTT server
var settings = {};

// populate the settings object from Homey's ManagerSettings; these are the app settings that define the MQTT server, credentials, etc.
function _getSettings(){
  var keys = ManagerSettings.getKeys();
  keys.forEach(function(key){
    settings[key] = ManagerSettings.get(key)
  }); // keys.forEach
}; // _getSettings

// add event handler that is fired when server settings change, to repopulate the local object
ManagerSettings.on('set', function(key){
  _getSettings();
}); // ManagerSettings.on

const ROOT_TOPIC = 'environment-station';
const TYPE       = 'environment-station';

module.exports = class EnvironmentStationDriver extends Homey.Driver {

  /// helper functions

  _log(message){
    if (process.env.DEBUG === '1'){ this.log(message) };
  }; // _log

  /// handlers for homey events fired in the relevant driver.js file

  onInit(){
    this.type = this.getType();
  }; // onInit

  // socket is passed from the Homey library
  onPair(socket){

    /// helper functions used exclusively within this function

    // add an object to the devices array; it is this array that is emitted back to the client
    function _addDevice(array){

      // check if this topic is already paired; if so it will be in pairedDevices, which is itself an array of topics
      if (pairedDevices.indexOf(array[1]) !== -1){ return };

      // check to see if we already have an object in the devices array for this device
      let found = false;
      devices.forEach((obj) => {
        if (obj.data && obj.data.id && obj.data.id === array[1]){ found = true }
      }); // devices.forEach

      // if the device isn't in the array we can construct an object and add to the devices array to be emitted back to the client
      if (found === false){
        devices.push({'name': array[1], 'data': {'id': array[1]}, 'settings': {}});
      }; // if

    }; //_addDevice

    // define a function to emit devices during the search; Homey will search for 30 seconds
    function _returnDevices(){

      // now sort the array
      devices.sort(function(a,b){
        if (a.name > b.name){ return 1 };
        if (a.name < b.name){ return -1 };
        return 0; // same
      }); // devices.sort

      // if we're sure the search is complete then we can fire callback(null, devices); but it's hard to know whether
      // we've received all the devices from the MQTT server so best to just .emit with the latest list, even if
      // incomplete, and rely on Homey's 30 second timeout to end the process. The user can select and start the pairing
      // process with a discovered device at any time, so this approach doesn't degrade the user experience

      // return the array of devices to the client by emitting on the WebSocket socket
      // format of the array is [{ data: { id: '1234' }, name: 'foo' }, ...]
      socket.emit('list_devices', devices);

    }; // _returnDevices

    // define a function to close the connection and return the devices to the client
    function _closeConnection(){
      clearInterval(interval); // stop sending the list of devices back to the client every 500ms
      client.end();            // tidy up, close the connection to the MQTT server
    }; // _closeConnection

    /// onPair functionality starts here

    // validate that type is specified and valid
    if (!this.type || this.type !== TYPE){
      throw new Error('invalid or missing type passed to onPair() in ./lib/driver.js')
    } else {
      this._log('onPair() in ./lib/driver.js, pairing started for type '+this.type)
    }; //if

    _getSettings(); // perform initial population of the local object from the ManagerSettings containing the MQTT server connection settings

    const CLOSETIMEOUT = 10000; // ms == seconds * 1000, 10000ms = 10 seconds
    const EMITTIMEOUT  = 1000;  // 1 second

    var devices = []; // define empty array of devices that we'll populate with objects in the prescribed format
    var objects = {}; // create an empty object to store the raw data returned from the MQTT server
    var pairedDevices = []; // to populate with the MQTTtopics of the existing paired devices
    var client, interval, index, i, device, type, options, existingDevices; // working variables

    type            = this.type;
    options         = {};
    existingDevices = this.getDevices(); // get an array of device objects of all the devices of this type already paired

    // populate the pairedDevices array with the settings.topic from the existingDevices array of objects
    if (existingDevices.length > 0){
      existingDevices.forEach((item, i) => {
        pairedDevices.push(item.getSettings().topic) // item is a Device object so has a getSettings() function, MQTTtopic is defined in the settings for each Device
      }); // .forEach
    }; // if

    // called when the Homey client wants to pair with a new device; socket is passed by Homey and it triggers
    // the event 'list_devices' which then handles connecting to the MQTT server, etc. and returning a list of relevant devices
    socket.on('list_devices', function(data, callback){

      // we should have a server defined, either from the settings or if not default from the env.json file, so start to get devices from MQTT
      if (settings.server){

        // after CLOSETIMEOUT amount of time run the _closeConnection function
        setTimeout(_closeConnection, CLOSETIMEOUT);

        // every EMITTIMEOUT amount of time run the _returnDevices function and store result in interval
        interval = setInterval(_returnDevices, EMITTIMEOUT);

        // construct a connection object with credentials, if specified
        if (settings.username){ options.username = username };
        if (settings.password){ options.password = password };

        // try to connect to the MQTT server; if successful then client will emit events that we'll trap and handle below
        client = mqtt.connect('tcp://'+settings.server+':'+settings.port, options);

        // define event handler for MQTT 'connect' events
        client.on('connect', function(){

          // we've successfully connected so subscribe to the root topic # to receive all topics as messages
          client.subscribe('#', {}, function(err, granted){
            if (err){
              callback(err, null);  // invoke the callback function passed in socket.on
            }; // if
          }); // client.subscribe

          // define event handler for MQTT 'message' events which are emitted when the client receives a publish packet
          client.on('message', function(topic, message, packet){

            let array = topic.split('/');   // split the string into an array using '/' as the delimiter, first element is the topic

            // only process further if the root topic received is the one we're looking for, and the array has three elements
            if (array[0] === ROOT_TOPIC && array.length === 3){
              _addDevice(array);
            }; // if

          }); // client.on message

        }); // client.on connect

        // define event handler for MQTT 'error' events
        client.on('error', function(err){
          if (typeof client.end === 'function'){ client.end() }; // as an error was returned so try and tidy up after ourselves and close the connection
          callback(err, null); // invoke the callback function passed in socket.on
        }); // client.on error

      } else {

        throw new Error('MQTT server not specified')

      }; // if (server){

    }); // socket.on('list_devices'...

  }; // onPair

}; // module.exports
