const fs = require('fs');
const path = require('path');

const appsDir = path.join(__dirname, '..', '..', 'apps');
const apiRoutesDir = path.join(appsDir, 'api', 'src', 'modules');
const webApiDir = path.join(appsDir, 'web', 'src', 'api');

function audit() {
  const report = {
    totalRoutesChecked: 0,
    totalAPIsChecked: 0,
    totalErrors: 0,
    critical: [],
    high: [],
    medium: [],
    low: []
  };

  // 1. Audit Frontend API Hooks
  const webApiFiles = fs.readdirSync(webApiDir).filter(f => f.endsWith('.ts'));
  report.totalAPIsChecked = webApiFiles.length;

  for (const file of webApiFiles) {
    const content = fs.readFileSync(path.join(webApiDir, file), 'utf8');
    
    // Check if hook is extracting data incorrectly
    // e.g., if it uses return r.data.data but the component uses data?.items
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('apiClient.get') || line.includes('apiClient.post') || line.includes('apiClient.put') || line.includes('apiClient.patch')) {
        // Just note if it returns r.data or r.data.data
        if (line.includes('return r.data.data') && line.includes('/issues')) {
          report.critical.push(`[${file}:${i+1}] issues API returns r.data.data but backend returns paginated result (items, total). This causes empty lists.`);
          report.totalErrors++;
        }
      }
    });
  }

  // 2. Audit Backend Routes
  const modules = fs.readdirSync(apiRoutesDir);
  for (const mod of modules) {
    const routeFile = path.join(apiRoutesDir, mod, `${mod}.routes.ts`);
    if (fs.existsSync(routeFile)) {
      const content = fs.readFileSync(routeFile, 'utf8');
      
      const routeMatches = content.match(/router\.(get|post|put|patch|delete)\(.*?{/g);
      if (routeMatches) {
        report.totalRoutesChecked += routeMatches.length;
      }
      
      if (content.includes('res.json({ success: true, ...result })')) {
        report.high.push(`[${mod}.routes.ts] Returns spreading result instead of data wrapper. Ensure frontend hook handles this correctly.`);
        report.totalErrors++;
      }
    }
  }

  // 3. Search for data?.items in frontend components
  const searchItems = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        searchItems(fullPath);
      } else if (fullPath.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('data?.items')) {
          report.critical.push(`[${file}] Uses data?.items but most hooks return r.data.data (the array itself). List will show empty.`);
          report.totalErrors++;
        }
        if (content.includes('data?.data')) {
           report.medium.push(`[${file}] Uses data?.data. Check if hook returns r.data or r.data.data.`);
           report.totalErrors++;
        }
        if (content.includes('schedulesResponse?.data')) {
           report.critical.push(`[${file}] Uses schedulesResponse?.data but PM hook returns array. Will show empty list.`);
           report.totalErrors++;
        }
      }
    }
  };
  searchItems(path.join(appsDir, 'web', 'src', 'pages'));

  console.log(JSON.stringify(report, null, 2));
}

audit();
