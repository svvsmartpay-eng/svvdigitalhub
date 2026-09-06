const fs = require('fs');
let content = fs.readFileSync('apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx', 'utf8');

// The original horizontal toolbar to remove:
const toolsRegex = /\{\/\* Editing Tools Controls \*\/\}\s*<div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">[\s\S]*?FlipHorizontal[\s\S]*?<\/button>\s*<\/div>/;
content = content.replace(toolsRegex, '');

// The canvas to wrap:
const canvasRegex = /\{\/\* THE UNIVERSAL PREVIEW CANVAS \*\/\}\s*<div className="flex-1 relative overflow-hidden bg-\[\#F1F5F9\] w-full flex items-center justify-center p-4">/;

const verticalToolbar = `
              {/* Vertical Editing Tools Controls */}
              <div className="w-14 bg-[#FFFFFF] border-r border-[#E2E8F0] flex flex-col items-center py-3 gap-3 shrink-0 z-10 overflow-y-auto no-scrollbar shadow-sm">
                <button
                  onClick={() => setCropToolType('FREE_TRANSFORM')}
                  className={\`w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer \${cropToolType === 'FREE_TRANSFORM' ? 'bg-[#0D6EFD] text-white shadow-xs' : 'bg-[#F8FAFC] text-[#495057] hover:bg-[#E2E8F0] border border-[#E2E8F0]'}\`}
                  title="Free Crop"
                >
                  <Crop className="w-4 h-4" />
                  <span className="text-[8px] font-bold leading-none">Crop</span>
                </button>
  
                <button
                  onClick={() => setCropToolType('SCANNER_CORNER_PERSPECTIVE')}
                  className={\`w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer \${cropToolType === 'SCANNER_CORNER_PERSPECTIVE' ? 'bg-[#0D6EFD] text-white shadow-xs' : 'bg-[#F8FAFC] text-[#495057] hover:bg-[#E2E8F0] border border-[#E2E8F0]'}\`}
                  title="4-Corner Scanner"
                >
                  <Sliders className="w-4 h-4" />
                  <span className="text-[8px] font-bold leading-none">Scan</span>
                </button>
  
                <button
                  onClick={handleAutoDetectEdges}
                  className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 bg-[#E8F5E9] hover:bg-[#DCFCE7] text-[#198754] border border-[#86EFAC] cursor-pointer shadow-xs"
                  title="Auto Crop & Detect"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[8px] font-bold leading-none">Auto</span>
                </button>
                
                <div className="w-6 h-px bg-[#CBD5E1] shrink-0 my-0.5"></div>
  
                <button
                  onClick={() => alert("Deskew algorithm initialized...")}
                  className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] border border-[#E2E8F0] cursor-pointer"
                  title="Deskew"
                >
                  <Wand2 className="w-4 h-4 text-[#6F42C1]" />
                  <span className="text-[8px] font-bold leading-none text-[#6F42C1]">Deskew</span>
                </button>
  
                <button
                  onClick={() => rotateSourceImage(90)}
                  className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] border border-[#E2E8F0] cursor-pointer"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4 text-[#0D6EFD]" />
                  <span className="text-[8px] font-bold leading-none text-[#0D6EFD]">Rotate</span>
                </button>
  
                <button
                  onClick={() => flipSourceImage(true, false)}
                  className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] border border-[#E2E8F0] cursor-pointer"
                  title="Flip Horizontal"
                >
                  <FlipHorizontal className="w-4 h-4 text-[#0D6EFD]" />
                  <span className="text-[8px] font-bold leading-none text-[#0D6EFD]">Flip</span>
                </button>
              </div>`;

content = content.replace(canvasRegex, `<div className="flex-1 flex flex-row overflow-hidden relative w-full">\n${verticalToolbar}\n\n            {/* THE UNIVERSAL PREVIEW CANVAS */}\n            <div className="flex-1 relative overflow-hidden bg-[#F1F5F9] w-full flex items-center justify-center p-4">`);

const rightPanelStart = content.indexOf('RIGHT PANEL: LIVE OUTPUT PREVIEWS');
const lastClosingDivBeforeRightPanel = content.lastIndexOf('</div>', rightPanelStart);
content = content.substring(0, lastClosingDivBeforeRightPanel) + '</div>\n          ' + content.substring(lastClosingDivBeforeRightPanel);

fs.writeFileSync('apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx', content);
console.log("Layout 4 fixed.");
