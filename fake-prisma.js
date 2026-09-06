#!/usr/bin/env node
const { execSync } = require('child_process');
console.log('--- INTERCEPTED PRISMA ---');
const args = process.argv.slice(2).join(' ');
execSync('npx prisma@5.16.0 ' + args, { stdio: 'inherit' });
