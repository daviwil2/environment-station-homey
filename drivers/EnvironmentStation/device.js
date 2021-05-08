// device.js for EnvironmentStation

'use strict';

const Homey              = require('homey');
const EnvironmentStation = require('../../lib/device');

module.exports = class extends EnvironmentStation {

  getType(){
    return 'environment-station'
  }; // getType()

};
