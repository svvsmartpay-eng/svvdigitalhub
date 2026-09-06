const fs = require('fs');
let content = fs.readFileSync('apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx', 'utf8');

// Find the start of the center panel
const centerPanelStart = content.indexOf('CENTER PANEL: MAIN EDITING CANVAS');
if (centerPanelStart === -1) {
  console.log("Could not find center panel start");
  process.exit(1);
}

// Find the start of the editing tools controls
const editingToolsStart = content.indexOf('{/* Editing Tools Controls */}', centerPanelStart);
const flipButtonEnd = content.indexOf('FlipHorizontal', editingToolsStart);
const editingToolsEnd = content.indexOf('</div>', flipButtonEnd) + 6;

const fullEditingToolsDiv = content.substring(editingToolsStart, editingToolsEnd);

// Remove the horizontal editing tools
content = content.replace(fullEditingToolsDiv, '');

// Find the start of the main canvas
const canvasStart = content.indexOf('{/* THE UNIVERSAL PREVIEW CANVAS */}', centerPanelStart);

// Let's create the vertical toolbar
const verticalToolbar = `
              {/* Vertical Editing Tools Controls */}
              <div className="w-16 bg-[#FFFFFF] border-r border-[#E2E8F0] flex flex-col items-center py-3 gap-3 shrink-0 z-10 overflow-y-auto no-scrollbar shadow-sm">
                <button
                  onClick={() => setCropToolType('FREE_TRANSFORM')}
                  className={\`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer \${cropToolType === 'FREE_TRANSFORM' ? 'bg-[#0D6EFD] text-white shadow-xs' : 'bg-[#F8FAFC] text-[#495057] hover:bg-[#E2E8F0] border border-[#E2E8F0]'}\`}
                  title="Free Crop"
                >
                  <Crop className="w-4 h-4" />
                  <span className="text-[9px] font-bold leading-none">Crop</span>
                </button>
  
                <button
                  onClick={() => setCropToolType('SCANNER_CORNER_PERSPECTIVE')}
                  className={\`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer \${cropToolType === 'SCANNER_CORNER_PERSPECTIVE' ? 'bg-[#0D6EFD] text-white shadow-xs' : 'bg-[#F8FAFC] text-[#495057] hover:bg-[#E2E8F0] border border-[#E2E8F0]'}\`}
                  title="4-Corner Scanner"
                >
                  <Sliders className="w-4 h-4" />
                  <span className="text-[9px] font-bold leading-none text-center">Scan</span>
                </button>
  
                <button
                  onClick={handleAutoDetectEdges}
                  className="w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 bg-[#E8F5E9] hover:bg-[#DCFCE7] text-[#198754] border border-[#86EFAC] cursor-pointer shadow-xs"
                  title="Auto Crop & Detect"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[9px] font-bold leading-none">Auto</span>
                </button>
                
                <div className="w-8 h-px bg-[#CBD5E1] shrink-0 my-1"></div>
  
                <button
                  onClick={() => alert("Deskew algorithm initialized...")}
                  className="w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] border border-[#E2E8F0] cursor-pointer"
                  title="Deskew"
                >
                  <Wand2 className="w-4 h-4 text-[#6F42C1]" />
                  <span className="text-[9px] font-bold leading-none text-[#6F42C1]">Deskew</span>
                </button>
  
                <button
                  onClick={() => rotateSourceImage(90)}
                  className="w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] border border-[#E2E8F0] cursor-pointer"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4 text-[#0D6EFD]" />
                  <span className="text-[9px] font-bold leading-none text-[#0D6EFD]">Rotate</span>
                </button>
  
                <button
                  onClick={() => flipSourceImage(true, false)}
                  className="w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] border border-[#E2E8F0] cursor-pointer"
                  title="Flip Horizontal"
                >
                  <FlipHorizontal className="w-4 h-4 text-[#0D6EFD]" />
                  <span className="text-[9px] font-bold leading-none text-[#0D6EFD]">Flip</span>
                </button>
              </div>`;

// Insert the vertical toolbar and wrap the canvas in a flex row
content = content.replace('{/* THE UNIVERSAL PREVIEW CANVAS */}', 
  `<div className="flex-1 flex flex-row overflow-hidden relative w-full">
${verticalToolbar}
            
            {/* THE UNIVERSAL PREVIEW CANVAS */}
`);

// The canvas div originally closes right before the right panel.
// We need to add one more </div> to close our new flex-row wrapper.
const rightPanelStart = content.indexOf('RIGHT PANEL: LIVE OUTPUT PREVIEWS');
// Wait, the right panel start comment includes emojis. 
// Let's find the closing tag of the center panel:
// In the original code, the center panel closes with:
//           </div>
//   
//           {/* -- RIGHT PANEL
const closingDivIndex = content.lastIndexOf('</div>', rightPanelStart);
content = content.substring(0, closingDivIndex) + '</div>\n          ' + content.substring(closingDivIndex);

fs.writeFileSync('apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx', content);
console.log("Layout fixed.");
