// Comprehensive debug test for React Native app
const { execSync } = require('child_process');

console.log('=== COMPREHENSIVE REACT NATIVE DEBUG TEST ===\n');

// Test 1: Check if app is installed
console.log('1. Checking if app is installed...');
try {
  const installed = execSync('adb shell pm list packages | findstr gossipin', { encoding: 'utf8' });
  if (installed.trim()) {
    console.log('✅ App is installed:', installed.trim());
  } else {
    console.log('❌ App is not installed');
  }
} catch (error) {
  console.log('❌ Error checking app installation:', error.message);
}

// Test 2: Check if app is running
console.log('\n2. Checking if app is running...');
try {
  const running = execSync('adb shell "ps -A | grep gossipin"', { encoding: 'utf8' });
  if (running.trim()) {
    console.log('✅ App is running:', running.trim());
  } else {
    console.log('❌ App is not running');
  }
} catch (error) {
  console.log('❌ Error checking app status:', error.message);
}

// Test 3: Check Metro server
console.log('\n3. Checking Metro server...');
try {
  const metro = execSync('netstat -ano | findstr "8082"', { encoding: 'utf8' });
  if (metro.trim()) {
    console.log('✅ Metro is running on port 8082');
  } else {
    console.log('❌ Metro is not running on port 8082');
  }
} catch (error) {
  console.log('❌ Error checking Metro:', error.message);
}

// Test 4: Check bundle accessibility
console.log('\n4. Testing bundle accessibility...');
try {
  const http = require('http');
  const options = {
    hostname: 'localhost',
    port: 8082,
    path: '/index.bundle?platform=android&dev=true',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Bundle accessible: ${res.statusCode}, Size: ${res.headers['content-length']} bytes`);
    res.on('data', (chunk) => {
      if (chunk.toString().includes('GossipIn')) {
        console.log('✅ App content found in bundle');
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Bundle not accessible:', error.message);
  });

  req.on('timeout', () => {
    console.log('❌ Bundle request timed out');
    req.destroy();
  });

  req.end();
} catch (error) {
  console.log('❌ Error testing bundle:', error.message);
}

// Test 5: Check port forwarding
console.log('\n5. Checking port forwarding...');
try {
  const forwarding = execSync('adb reverse --list', { encoding: 'utf8' });
  if (forwarding.includes('8082')) {
    console.log('✅ Port forwarding is set up:', forwarding.trim());
  } else {
    console.log('❌ Port forwarding not set up for 8082');
  }
} catch (error) {
  console.log('❌ Error checking port forwarding:', error.message);
}

console.log('\n=== DEBUG TEST COMPLETE ===');
