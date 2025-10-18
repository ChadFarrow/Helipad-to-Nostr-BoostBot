#!/usr/bin/env node

// Manual BlockClock testing with different approaches
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BLOCKCLOCK_IP = '192.168.0.182';

async function runCommand(command) {
    try {
        const { stdout, stderr } = await execAsync(command);
        return { success: true, stdout, stderr };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function testBasicConnectivity() {
    console.log('🔍 Testing basic connectivity...');
    
    // Test ping
    const pingResult = await runCommand(`ping -c 1 -W 2 ${BLOCKCLOCK_IP}`);
    console.log(`Ping: ${pingResult.success ? '✅' : '❌'}`);
    
    // Test if port 80 is open
    const portResult = await runCommand(`timeout 2 bash -c 'echo > /dev/tcp/${BLOCKCLOCK_IP}/80' 2>/dev/null`);
    console.log(`Port 80: ${portResult.success ? '✅ Open' : '❌ Closed/Filtered'}`);
    
    return pingResult.success;
}

async function scanPorts() {
    console.log('\n🔍 Scanning common ports...');
    
    const commonPorts = [80, 443, 8080, 8000, 3000, 8443, 9000, 8888];
    const openPorts = [];
    
    for (const port of commonPorts) {
        const result = await runCommand(`timeout 1 bash -c 'echo > /dev/tcp/${BLOCKCLOCK_IP}/${port}' 2>/dev/null`);
        if (result.success) {
            openPorts.push(port);
            console.log(`Port ${port}: ✅ Open`);
        } else {
            console.log(`Port ${port}: ❌ Closed`);
        }
    }
    
    return openPorts;
}

async function tryDifferentHttpMethods() {
    console.log('\n🔍 Trying different HTTP approaches...');
    
    const methods = [
        'GET',
        'POST',
        'PUT'
    ];
    
    const endpoints = [
        '/',
        '/api',
        '/api/show/text/TEST',
        '/show/text/TEST',
        '/text/TEST',
        '/display/TEST'
    ];
    
    for (const method of methods) {
        for (const endpoint of endpoints) {
            const cmd = `curl -X ${method} -m 2 -s -v "http://${BLOCKCLOCK_IP}${endpoint}" 2>&1 | head -5`;
            const result = await runCommand(cmd);
            
            if (result.success && !result.stdout.includes('Empty reply') && !result.stdout.includes('Connection refused')) {
                console.log(`✅ ${method} ${endpoint} - Response received`);
                console.log(`   Response: ${result.stdout.substring(0, 100)}...`);
            } else {
                console.log(`❌ ${method} ${endpoint} - ${result.stdout.includes('Empty reply') ? 'Empty reply' : 'Failed'}`);
            }
        }
    }
}

async function tryHttps() {
    console.log('\n🔍 Trying HTTPS...');
    
    const httpsCmd = `curl -k -m 2 -s -v "https://${BLOCKCLOCK_IP}/" 2>&1 | head -5`;
    const result = await runCommand(httpsCmd);
    
    if (result.success && !result.stdout.includes('Connection refused')) {
        console.log('✅ HTTPS might work');
        console.log(`Response: ${result.stdout}`);
        return true;
    } else {
        console.log('❌ HTTPS failed');
        return false;
    }
}

async function tryRawTcpConnection() {
    console.log('\n🔍 Trying raw TCP connection...');
    
    const ncCmd = `echo "GET / HTTP/1.1\\r\\nHost: ${BLOCKCLOCK_IP}\\r\\n\\r\\n" | nc -w 2 ${BLOCKCLOCK_IP} 80 2>/dev/null || echo "NC failed"`;
    const result = await runCommand(ncCmd);
    
    console.log(`Raw TCP result: ${result.stdout}`);
    return result.success;
}

async function suggestAlternatives() {
    console.log('\n💡 Alternative approaches to try:');
    console.log('1. Check the BlockClock Mini web interface manually in a browser');
    console.log(`   Visit: http://${BLOCKCLOCK_IP}`);
    console.log('2. Check if the device has a different IP or is on a different network');
    console.log('3. Look for device-specific documentation or firmware version');
    console.log('4. Try connecting via the manufacturer\'s mobile app to see what endpoints it uses');
    console.log('5. Check if the device requires authentication or has API keys');
    console.log('6. Consider packet capture to see what the official app sends');
    
    console.log('\n📱 You can still integrate this with your helipad bot:');
    console.log('- Use it as a fallback logging mechanism');
    console.log('- Store messages for when the device becomes available');
    console.log('- Add manual trigger endpoints to test when you fix the connection');
}

async function main() {
    console.log('🧪 BlockClock Mini Manual Testing\n');
    
    const isConnected = await testBasicConnectivity();
    
    if (!isConnected) {
        console.log('❌ Device not reachable via ping');
        return;
    }
    
    const openPorts = await scanPorts();
    
    if (openPorts.length === 0) {
        console.log('❌ No common ports are open');
        return;
    }
    
    await tryDifferentHttpMethods();
    await tryHttps();
    await tryRawTcpConnection();
    await suggestAlternatives();
}

main().catch(console.error);