import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('apps/web/dist');
const destDir = path.resolve('dist');

if (fs.existsSync(srcDir)) {
  console.log(`Copying built files from ${srcDir} to ${destDir}...`);
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log('✅ Successfully copied to root dist directory.');
} else {
  console.error(`❌ Source directory ${srcDir} does not exist.`);
}

// Also copy serverless API functions to root api directory
const srcApi = path.resolve('apps/web/api');
const destApi = path.resolve('api');
if (fs.existsSync(srcApi)) {
  fs.cpSync(srcApi, destApi, { recursive: true });
  console.log('✅ Successfully copied serverless API handlers to root api directory.');
}
