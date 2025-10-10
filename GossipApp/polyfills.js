// Polyfills for React Native
import 'react-native-get-random-values';

// Set up Buffer
import { Buffer } from '@craftzdog/react-native-buffer';
global.Buffer = Buffer;

// Set up process
global.process = require('process');

// Set up stream
global.stream = require('readable-stream');

// Set up other globals
global.StringDecoder = require('string_decoder').StringDecoder;
global.safeBuffer = require('safe-buffer');
