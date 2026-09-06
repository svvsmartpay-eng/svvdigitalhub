const fs = require('fs');
let content = fs.readFileSync('apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx', 'utf8');

const toolbarStartString = '{/* Editing Tools Controls */}';
const toolbarEndString = 'title="Reset Crop"\n                >\n                  <RefreshCw className="w-3.5 h-3.5" />\n                </button>\n              </div>';

const startIndex = content.indexOf(toolbarStartString);
const endIndex = content.indexOf(toolbarEndString, startIndex) + toolbarEndString.length;

if (startIndex === -1 || content.indexOf(toolbarEndString, startIndex) === -1) {
  console.log("Could not find toolbar bounds accurately");
  process.exit(1);
}

// Remove the toolbar completely from its original location
const beforeToolbar = content.substring(0, startIndex);
const afterToolbar = content.substring(endIndex);

let newContent = beforeToolbar + afterToolbar;

// Now, we need to wrap the canvas.
// The canvas is: {/* THE UNIVERSAL PREVIEW CANVAS */}
// And it ends with: </div>\n          </div>\n\n          {/* -- RIGHT PANEL
const canvasMarker = '{/* THE UNIVERSAL PREVIEW CANVAS */}';
const canvasIndex = newContent.indexOf(canvasMarker);

const verticalToolbar = `
              {/* Vertical Editing Tools Controls */}
              <div className="w-14 bg-[#FFFFFF] border-r border-[#E2E8F0] flex flex-col items-center py-3 gap-3 shrink-0 z-10 overflow-y-auto no-scrollbar shadow-sm">
                <button onClick={() => setCropToolType('FREE_TRANSFORM')} className={\`w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer \${cropToolType === 'FREE_TRANSFORM' ? 'bg-[#0D6EFD] text-white shadow-xs' : 'bg-[#F8FAFC] text-[#495057] hover:bg-[#E2E8F0] border border-[#E2E8F0]'}\`} title="Free Crop">
                  <Crop className="w-4 h-4" />
                  <span className="text-[8px] font-bold leading-none">Crop</span>
                </button>
                <button onClick={() => setCropToolType('SCANNER_CORNER_PERSPECTIVE')} className={\`w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer \${cropToolType === 'SCANNER_CORNER_PERSPECTIVE' ? 'bg-[#0D6EFD] text-white shadow-xs' : 'bg-[#F8FAFC] text-[#495057] hover:bg-[#E2E8F0] border border-[#E2E8F0]'}\`} title="4-Corner Scanner">
                  <Sliders className="w-4 h-4" />
                  <span className="text-[8px] font-bold leading-none">Scan</span>
                </button>
                <button onClick={handleAutoDetectEdges} className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 bg-[#E8F5E9] hover:bg-[#DCFCE7] text-[#198754] border border-[#86EFAC] cursor-pointer shadow-xs" title="Auto Crop & Detect">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[8px] font-bold leading-none">Auto</span>
                </button>
                <div className="w-6 h-px bg-[#CBD5E1] shrink-0 my-0.5"></div>
                <button onClick={() => alert("Deskew algorithm initialized...")} className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] border border-[#E2E8F0] cursor-pointer" title="Deskew">
                  <Wand2 className="w-4 h-4 text-[#6F42C1]" />
                  <span className="text-[8px] font-bold leading-none text-[#6F42C1]">Deskew</span>
                </button>
                <button onClick={() => rotateSourceImage(90)} className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] border border-[#E2E8F0] cursor-pointer" title="Rotate 90°">
                  <RotateCw className="w-4 h-4 text-[#0D6EFD]" />
                  <span className="text-[8px] font-bold leading-none text-[#0D6EFD]">Rotate</span>
                </button>
                <button onClick={() => flipSourceImage(true, false)} className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] border border-[#E2E8F0] cursor-pointer" title="Flip Horizontal">
                  <FlipHorizontal className="w-4 h-4 text-[#0D6EFD]" />
                  <span className="text-[8px] font-bold leading-none text-[#0D6EFD]">Flip</span>
                </button>
                <div className="w-6 h-px bg-[#CBD5E1] shrink-0 my-0.5"></div>
                <button onClick={() => alert("Brightness/Contrast filter")} className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] border border-[#E2E8F0] cursor-pointer" title="Brightness">
                  <Sun className="w-4 h-4 text-[#EAB308]" />
                  <span className="text-[8px] font-bold leading-none text-[#EAB308]">Bright</span>
                </button>
                <button onClick={() => alert("Brightness/Contrast filter")} className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] border border-[#E2E8F0] cursor-pointer" title="Contrast">
                  <Contrast className="w-4 h-4 text-[#14B8A6]" />
                  <span className="text-[8px] font-bold leading-none text-[#14B8A6]">Contr</span>
                </button>
                <button onClick={handleResetQuad} className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 bg-[#FFF4EC] hover:bg-[#FED7AA] text-[#EA580C] border border-[#FDBA74] cursor-pointer shadow-xs mt-auto" title="Reset Crop">
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-[8px] font-bold leading-none">Reset</span>
                </button>
              </div>
`;

// Wrap the canvas in flex-row
newContent = newContent.substring(0, canvasIndex) + 
`<div className="flex-1 flex flex-row overflow-hidden relative w-full">\n` + 
verticalToolbar + '\n' +
newContent.substring(canvasIndex);

// Add the closing div before the right panel
const rightPanelRegex = /\{\/\* \u2502 \u2502 RIGHT PANEL/g;
const rightPanelMatch = rightPanelRegex.exec(newContent);
if (rightPanelMatch) {
  const rightPanelIndex = rightPanelMatch.index;
  const lastClosingDiv = newContent.lastIndexOf('</div>', rightPanelIndex);
  newContent = newContent.substring(0, lastClosingDiv) + '</div>\n          ' + newContent.substring(lastClosingDiv);
} else {
    // If the comment doesn't use the box drawing character, let's just search for 'RIGHT PANEL: LIVE OUTPUT PREVIEWS'
    const rightPanelIndexAlt = newContent.indexOf('RIGHT PANEL: LIVE OUTPUT PREVIEWS');
    const lastClosingDivAlt = newContent.lastIndexOf('</div>', rightPanelIndexAlt);
    newContent = newContent.substring(0, lastClosingDivAlt) + '</div>\n          ' + newContent.substring(lastClosingDivAlt);
}

fs.writeFileSync('apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx', newContent);
console.log("Layout 5 fixed.");
