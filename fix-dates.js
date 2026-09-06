const fs = require('fs');
const file = 'apps/web/src/pages/print-hub/PrintQueuePage.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/<option value="ALL">[^<]*All Dates<\/option>/g, '<option value="ALL">📅 All Dates</option>');
code = code.replace(/<option value="TODAY">[^<]*Today<\/option>/g, '<option value="TODAY">📅 Today</option>');
code = code.replace(/<option value="YESTERDAY">[^<]*Yesterday<\/option>/g, '<option value="YESTERDAY">📅 Yesterday</option>');
code = code.replace(/<option value="THIS_WEEK">[^<]*This Week<\/option>/g, '<option value="THIS_WEEK">📅 This Week</option>');

fs.writeFileSync(file, code, 'utf8');
