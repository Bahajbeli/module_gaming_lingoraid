const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Évite "spawn EPERM" sur Windows (antivirus / OneDrive / workers Metro)
config.maxWorkers = 1;

module.exports = config;
