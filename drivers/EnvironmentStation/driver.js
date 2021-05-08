// driver.js for EnvironmentStation

'use strict';

const Homey              = require('homey');
const EnvironmentStation = require('../../lib/driver');

module.exports = class extends EnvironmentStation {

  getType(){
    return 'environment-station';
  }; // getType()

};
