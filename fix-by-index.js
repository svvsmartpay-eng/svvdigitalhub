const fs = require('fs');
const file = 'apps/web/src/pages/print-hub/PrintQueuePage.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');
lines[554] = '            <option value="ALL">📅 All Dates</option>';
lines[555] = '            <option value="TODAY">📅 Today</option>';
lines[556] = '            <option value="YESTERDAY">📅 Yesterday</option>';
lines[557] = '            <option value="THIS_WEEK">📅 This Week</option>';
fs.writeFileSync(file, lines.join('\n'), 'utf8');
