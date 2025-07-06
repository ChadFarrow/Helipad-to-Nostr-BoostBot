#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const LAUNCH_AGENTS_DIR = join(homedir(), 'Library/LaunchAgents');
const AGENT_LABEL = 'com.boostbot.helipad';
const AGENT_PLIST = join(LAUNCH_AGENTS_DIR, `${AGENT_LABEL}.plist`);

function createLaunchAgentPlist() {
  const currentDir = process.cwd();
  const nodePath = execSync('which node', { encoding: 'utf8' }).trim();
  const npmPath = execSync('which npm', { encoding: 'utf8' }).trim();
  
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${AGENT_LABEL}</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${join(currentDir, 'scripts/auto-restart.js')}</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>${currentDir}</string>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>${join(currentDir, 'logs/launch-agent.log')}</string>
    
    <key>StandardErrorPath</key>
    <string>${join(currentDir, 'logs/launch-agent-error.log')}</string>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>
    
    <key>ProcessType</key>
    <string>Background</string>
    
    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>`;

  return plist;
}

function ensureLogsDirectory() {
  const logsDir = join(process.cwd(), 'logs');
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }
}

function installLaunchAgent() {
  try {
    console.log('🚀 Installing BoostBot Launch Agent...');
    
    // Ensure LaunchAgents directory exists
    if (!existsSync(LAUNCH_AGENTS_DIR)) {
      mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });
    }
    
    // Ensure logs directory exists
    ensureLogsDirectory();
    
    // Create the plist file
    const plistContent = createLaunchAgentPlist();
    writeFileSync(AGENT_PLIST, plistContent);
    
    console.log(`✅ Launch agent plist created: ${AGENT_PLIST}`);
    
    // Load the launch agent
    execSync(`launchctl load ${AGENT_PLIST}`, { stdio: 'inherit' });
    console.log('✅ Launch agent loaded successfully');
    
    // Start the service
    execSync(`launchctl start ${AGENT_LABEL}`, { stdio: 'inherit' });
    console.log('✅ Launch agent started successfully');
    
    console.log('\n🎉 BoostBot Launch Agent installed and running!');
    console.log('📝 The bot will now:');
    console.log('   • Start automatically when you log in');
    console.log('   • Keep running when your Mac is locked or sleeping');
    console.log('   • Auto-restart if it crashes');
    console.log('   • Log output to logs/launch-agent.log');
    
    console.log('\n📋 Useful commands:');
    console.log(`   • Check status: launchctl list | grep ${AGENT_LABEL}`);
    console.log(`   • Stop service: launchctl stop ${AGENT_LABEL}`);
    console.log(`   • Unload service: launchctl unload ${AGENT_PLIST}`);
    console.log('   • View logs: tail -f logs/launch-agent.log');
    
  } catch (error) {
    console.error('❌ Failed to install launch agent:', error.message);
    process.exit(1);
  }
}

function uninstallLaunchAgent() {
  try {
    console.log('🛑 Uninstalling BoostBot Launch Agent...');
    
    // Stop the service
    execSync(`launchctl stop ${AGENT_LABEL}`, { stdio: 'pipe' });
    
    // Unload the launch agent
    execSync(`launchctl unload ${AGENT_PLIST}`, { stdio: 'pipe' });
    
    // Remove the plist file
    if (existsSync(AGENT_PLIST)) {
      execSync(`rm ${AGENT_PLIST}`);
    }
    
    console.log('✅ Launch agent uninstalled successfully');
    
  } catch (error) {
    console.error('❌ Failed to uninstall launch agent:', error.message);
    process.exit(1);
  }
}

function checkStatus() {
  try {
    const output = execSync(`launchctl list | grep ${AGENT_LABEL}`, { encoding: 'utf8' });
    console.log('✅ Launch agent is installed and running:');
    console.log(output);
  } catch (error) {
    console.log('❌ Launch agent is not running or not installed');
  }
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'install':
    installLaunchAgent();
    break;
  case 'uninstall':
    uninstallLaunchAgent();
    break;
  case 'status':
    checkStatus();
    break;
  default:
    console.log('Usage: node scripts/install-launch-agent.js [install|uninstall|status]');
    console.log('');
    console.log('Commands:');
    console.log('  install   - Install and start the launch agent');
    console.log('  uninstall - Stop and remove the launch agent');
    console.log('  status    - Check if the launch agent is running');
    break;
} 