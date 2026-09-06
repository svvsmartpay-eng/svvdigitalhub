const fs = require('fs');
let content = fs.readFileSync('apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx', 'utf8');

// 1. Fix loadSourceFile URL parsing and crossOrigin
content = content.replace(
  /const cleanRelUrl = url\.startsWith\('http'\)[\s\S]*?const primaryUrl = directBackendUrl;/m,
  `const isDataUrl = url.startsWith('data:');\n      const cleanRelUrl = url.startsWith('http')\n        ? url.replace(/^http:\\/\\/[^/]+/, '')\n        : (url.startsWith('/') ? url : \`/\${url}\`);\n      const directBackendUrl = url.startsWith('http') || isDataUrl ? url : \`http://localhost:4000\${cleanRelUrl}\`;\n      const primaryUrl = directBackendUrl;`
);

content = content.replace(
  /const tryLoadImg = \(src: string, isRetry = false\) => \{\s*const img = new Image\(\);\s*img\.crossOrigin = 'anonymous';/g,
  `const tryLoadImg = (src: string, isRetry = false) => {\n          const img = new Image();\n          if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';`
);

// 2. Fix the layout by moving tools to the left side
const centerPanelRegex = /\{\/\* \u2502 \u2502 CENTER PANEL: MAIN EDITING CANVAS WITH INTEGRATED CROP TOOLS \(5 cols\) \u2502 \u2502 \*\/\}([\s\S]*?)(?=\{\/\* \u2502 \u2502 RIGHT PANEL)/m;
let match = content.match(centerPanelRegex);
if (match) {
  let centerPanel = match[1];

  // Extract the "Editing Tools Controls" div
  const toolsStart = centerPanel.indexOf('{/* Editing Tools Controls */}');
  if (toolsStart > -1) {
    let toolsEnd = centerPanel.indexOf('</div>', centerPanel.indexOf('FlipHorizontal') + 100);
    // actually, let's find the closing div of that toolbar correctly.
    // The horizontal toolbar is: <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
    // ends right before </div>\n            </div>\n\n            {/* THE UNIVERSAL PREVIEW CANVAS */}
    const canvasStart = centerPanel.indexOf('{/* THE UNIVERSAL PREVIEW CANVAS */}');
    const fullToolbar = centerPanel.substring(toolsStart, canvasStart);
    
    // Remove the full toolbar from the top header
    centerPanel = centerPanel.replace(fullToolbar, '');

    // Now insert the tools on the left side of the canvas
    // We need to wrap the canvas area in a flex-row
    const canvasAreaEnd = centerPanel.lastIndexOf('</div>\n          </div>'); 
    
    // Let's just do a simpler targeted replace.
    // 1. In the top bar, we only keep the Front/Back switcher. So we close the top bar div right after it.
    // Then we start a <div className="flex-1 flex flex-row overflow-hidden relative">
    // Add the vertical toolbar
    // Put the canvas inside.

    // I will replace the JSX manually using a regex for the structural parts.
  }
}
