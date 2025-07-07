#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const logger = {
  info: (msg) => console.log(`✅ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  section: (msg) => console.log(`\n🔍 ${msg}`)
};

class DockerPreflightCheck {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checks = {
      docker: false,
      dockerCompose: false,
      envFile: false,
      nostrKey: false,
      portAvailable: false,
      requiredFiles: false,
      dependencies: false,
      gitStatus: false
    };
  }

  async runAllChecks() {
    logger.section('Starting Docker Preflight Check');
    
    await this.checkDocker();
    await this.checkDockerCompose();
    await this.checkEnvironmentFile();
    await this.checkNostrKey();
    await this.checkPortAvailability();
    await this.checkRequiredFiles();
    await this.checkDependencies();
    await this.checkGitStatus();
    
    this.printSummary();
    return this.errors.length === 0;
  }

  async checkDocker() {
    try {
      const version = execSync('docker --version', { encoding: 'utf8' }).trim();
      logger.info(`Docker installed: ${version}`);
      this.checks.docker = true;
    } catch (error) {
      this.errors.push('Docker is not installed or not in PATH');
      logger.error('Docker is not installed or not in PATH');
    }
  }

  async checkDockerCompose() {
    try {
      const version = execSync('docker-compose --version', { encoding: 'utf8' }).trim();
      logger.info(`Docker Compose installed: ${version}`);
      this.checks.dockerCompose = true;
    } catch (error) {
      this.errors.push('Docker Compose is not installed or not in PATH');
      logger.error('Docker Compose is not installed or not in PATH');
    }
  }

  async checkEnvironmentFile() {
    const envFile = '.env';
    if (existsSync(envFile)) {
      logger.info(`Environment file exists: ${envFile}`);
      this.checks.envFile = true;
      
      // Check if .env file has content
      try {
        const content = readFileSync(envFile, 'utf8');
        if (content.trim().length === 0) {
          this.warnings.push('.env file exists but is empty');
          logger.warn('.env file exists but is empty');
        }
      } catch (error) {
        this.warnings.push('Could not read .env file');
        logger.warn('Could not read .env file');
      }
    } else {
      this.errors.push(`Environment file missing: ${envFile}`);
      logger.error(`Environment file missing: ${envFile}`);
      logger.info('Copy .env.example to .env and configure your settings');
    }
  }

  async checkNostrKey() {
    const envFile = '.env';
    if (!existsSync(envFile)) {
      this.errors.push('Cannot check Nostr key - .env file missing');
      return;
    }

    try {
      const content = readFileSync(envFile, 'utf8');
      const lines = content.split('\n');
      const nostrKeyLine = lines.find(line => line.startsWith('NOSTR_BOOST_BOT_NSEC='));
      
      if (nostrKeyLine) {
        const key = nostrKeyLine.split('=')[1]?.trim();
        if (key && key !== 'REPLACE_WITH_YOUR_ACTUAL_NOSTR_PRIVATE_KEY' && key.length > 0) {
          logger.info('Nostr private key is configured');
          this.checks.nostrKey = true;
        } else {
          this.errors.push('Nostr private key is not set (still has placeholder value)');
          logger.error('Nostr private key is not set (still has placeholder value)');
        }
      } else {
        this.errors.push('NOSTR_BOOST_BOT_NSEC not found in .env file');
        logger.error('NOSTR_BOOST_BOT_NSEC not found in .env file');
      }
    } catch (error) {
      this.errors.push('Could not read Nostr key from .env file');
      logger.error('Could not read Nostr key from .env file');
    }
  }

  async checkPortAvailability() {
    const port = process.env.PORT || '3333';
    
    try {
      // Check if port is in use
      const result = execSync(`lsof -i :${port}`, { encoding: 'utf8' });
      if (result.trim()) {
        this.warnings.push(`Port ${port} is already in use by another process`);
        logger.warn(`Port ${port} is already in use by another process`);
        logger.info('You may need to stop the existing process or change the port');
      } else {
        logger.info(`Port ${port} is available`);
        this.checks.portAvailable = true;
      }
    } catch (error) {
      // lsof returns non-zero exit code when port is not in use (which is good)
      logger.info(`Port ${port} is available`);
      this.checks.portAvailable = true;
    }
  }

  async checkRequiredFiles() {
    const requiredFiles = [
      'Dockerfile',
      'docker-compose.yml',
      'package.json',
      'helipad-webhook.js',
      'lib/nostr-bot.ts',
      'lib/music-show-bot.ts'
    ];

    let allFilesExist = true;
    
    for (const file of requiredFiles) {
      if (existsSync(file)) {
        logger.info(`Required file exists: ${file}`);
      } else {
        this.errors.push(`Required file missing: ${file}`);
        logger.error(`Required file missing: ${file}`);
        allFilesExist = false;
      }
    }

    this.checks.requiredFiles = allFilesExist;
  }

  async checkDependencies() {
    try {
      // Check if node_modules exists
      if (existsSync('node_modules')) {
        logger.info('Node dependencies installed (node_modules exists)');
        this.checks.dependencies = true;
      } else {
        this.warnings.push('node_modules not found - run npm install before building Docker');
        logger.warn('node_modules not found - run npm install before building Docker');
      }

      // Check package.json for required dependencies
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      const requiredDeps = ['nostr-tools', 'express'];
      
      for (const dep of requiredDeps) {
        if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
          logger.info(`Required dependency found: ${dep}`);
        } else {
          this.warnings.push(`Required dependency missing from package.json: ${dep}`);
          logger.warn(`Required dependency missing from package.json: ${dep}`);
        }
      }
    } catch (error) {
      this.errors.push('Could not check dependencies');
      logger.error('Could not check dependencies');
    }
  }

  async checkGitStatus() {
    try {
      // Check if we're in a git repository
      execSync('git status', { stdio: 'pipe' });
      
      // Check if there are uncommitted changes
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        this.warnings.push('You have uncommitted changes - consider committing before deploying');
        logger.warn('You have uncommitted changes - consider committing before deploying');
      } else {
        logger.info('Git repository is clean (no uncommitted changes)');
      }

      // Check if we're up to date with remote
      try {
        execSync('git fetch', { stdio: 'pipe' });
        const behind = execSync('git status --porcelain -b', { encoding: 'utf8' });
        if (behind.includes('[behind')) {
          this.warnings.push('Local repository is behind remote - consider pulling latest changes');
          logger.warn('Local repository is behind remote - consider pulling latest changes');
        } else {
          logger.info('Git repository is up to date with remote');
        }
      } catch (error) {
        logger.warn('Could not check git remote status');
      }

      this.checks.gitStatus = true;
    } catch (error) {
      this.warnings.push('Not in a git repository or git not available');
      logger.warn('Not in a git repository or git not available');
    }
  }

  printSummary() {
    logger.section('Preflight Check Summary');
    
    const totalChecks = Object.keys(this.checks).length;
    const passedChecks = Object.values(this.checks).filter(Boolean).length;
    
    console.log(`\n📊 Results: ${passedChecks}/${totalChecks} checks passed`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors (must be fixed):');
      this.errors.forEach(error => console.log(`  • ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings (should be addressed):');
      this.warnings.forEach(warning => console.log(`  • ${warning}`));
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n🎉 All checks passed! You\'re ready to run Docker.');
      console.log('\nNext steps:');
      console.log('  • docker-compose up -d    # Start the bot');
      console.log('  • docker-compose logs -f  # View logs');
      console.log('  • docker-compose down     # Stop the bot');
    } else if (this.errors.length === 0) {
      console.log('\n✅ No critical errors found. You can proceed with Docker, but consider addressing the warnings.');
    } else {
      console.log('\n❌ Critical errors found. Please fix these issues before running Docker.');
    }
  }
}

// Run the checks if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new DockerPreflightCheck();
  checker.runAllChecks().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Error running preflight checks:', error);
    process.exit(1);
  });
}

export { DockerPreflightCheck }; 