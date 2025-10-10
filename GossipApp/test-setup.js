// Test script to verify React Native setup
console.log('=== REACT NATIVE SETUP TEST ===');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);

// Test React Native CLI
const { execSync } = require('child_process');

try {
  console.log('\n=== TESTING REACT NATIVE CLI ===');
  const rnVersion = execSync('npx react-native --version', { encoding: 'utf8' });
  console.log('React Native CLI version:', rnVersion.trim());
} catch (error) {
  console.error('React Native CLI test failed:', error.message);
}

try {
  console.log('\n=== TESTING METRO BUNDLER ===');
  const metroVersion = execSync('npx metro --version', { encoding: 'utf8' });
  console.log('Metro version:', metroVersion.trim());
} catch (error) {
  console.error('Metro test failed:', error.message);
}

try {
  console.log('\n=== TESTING ADB CONNECTION ===');
  const adbDevices = execSync('adb devices', { encoding: 'utf8' });
  console.log('ADB devices:', adbDevices.trim());
} catch (error) {
  console.error('ADB test failed:', error.message);
}

console.log('\n=== SETUP TEST COMPLETE ===');
