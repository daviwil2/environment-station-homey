# Environment Station
This is an app for [Homey](https://homey.app/en-us/) that adds support for an Arduino-based suite of environment sensors that are populated on an MQTT server.
## Arduino application running on a Wemos D1 Mini
Code for the server application as a `.ino` file is available in the repo [emvironment-station-server](https://github.com/daviwil2/environment-station-server).
## Server
For the server I run [Eclipse Mosquitto™](https://mosquitto.org/) on a Mac mini server (running macOS 11 Big Sur) installed using [Homebrew](https://brew.sh/). Simply install Homebrew then `brew install mosquitto` to install the server. Mosquitto runs well on Linux or even a Raspberry Pi, and other MQTT server options are available: the MQTT client component used in the app is mature, stable and widely used so should connect to almost any server.
## Server configuration
Minimal server configuration is necessary: just the IP address and port number of the MQTT server, and the name of the root topic (which can include one or more subtopics separated by /). The app will pull defaults from the `env.json` file. If you want to use username and password authentication this is supported but SSL connections aren't.
## Still to do in a future release
- An HTTP API needs to be added in `api.js`  so that other applications can interact with the devices
- Additional languages other than English (i18n)
## License
Copyright (C) 2021 by David Williamson.

The source code is completely free and released under the [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) license.
