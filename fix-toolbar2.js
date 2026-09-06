const fs = require('fs');

const path = 'apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const startTag = '{/* Editing Tools Controls */}';
const endTag = `{/* Crop Target Layers (Front/Back toggle or PDF) */}`;

let startIndex = content.indexOf(startTag);
if (startIndex !== -1) {
  let endIndex = content.indexOf(endTag, startIndex);
  if (endIndex !== -1) {
    let before = content.substring(0, startIndex);
    let after = content.substring(endIndex); // keep endTag
    let replacement = `{/* Editing Tools Controls */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setCropToolType('FREE_TRANSFORM')}
                className={\`px-2 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 shrink-0 cursor-pointer \${cropToolType === 'FREE_TRANSFORM' ? 'bg-[#0D6EFD] text-white shadow-2xs' : 'bg-[#F8FAFC] text-[#495057] border border-[#E2E8F0]'}\`}
                title="Free Crop"
              >
                <Crop className="w-3 h-3" /> Free Crop
              </button>

              <button
                onClick={() => setCropToolType('SCANNER_CORNER_PERSPECTIVE')}
                className={\`px-2 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 shrink-0 cursor-pointer \${cropToolType === 'SCANNER_CORNER_PERSPECTIVE' ? 'bg-[#0D6EFD] text-white shadow-2xs' : 'bg-[#F8FAFC] text-[#495057] border border-[#E2E8F0]'}\`}
                title="4-Corner Scanner Perspective"
              >
                <Sliders className="w-3 h-3" /> 4-Corner
              </button>

              <button
                onClick={handleAutoDetectEdges}
                className="px-2 py-1 rounded-lg bg-[#E8F5E9] hover:bg-[#DCFCE7] text-[#198754] font-bold text-[10px] border border-[#86EFAC] flex items-center gap-1 shrink-0 cursor-pointer"
                title="Auto Crop & Detect Document"
              >
                <Sparkles className="w-3 h-3" /> Auto Crop / Detect
              </button>
              
              <div className="w-px h-4 bg-[#CBD5E1] mx-1 shrink-0"></div>

              <button
                onClick={() => alert("Deskew algorithm initialized...")}
                className="px-2 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] font-bold text-[10px] border border-[#E2E8F0] flex items-center gap-1 shrink-0 cursor-pointer"
                title="Auto Deskew"
              >
                <Wand2 className="w-3 h-3 text-[#6F42C1]" /> Deskew
              </button>

              <button
                onClick={() => rotateSourceImage(90)}
                className="px-2 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] font-bold text-[10px] border border-[#E2E8F0] flex items-center gap-1 shrink-0 cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw className="w-3 h-3 text-[#0D6EFD]" /> Rotate
              </button>

              <button
                onClick={() => alert("Flip horizontally")}
                className="px-2 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] font-bold text-[10px] border border-[#E2E8F0] flex items-center gap-1 shrink-0 cursor-pointer"
                title="Flip"
              >
                <FlipHorizontal className="w-3 h-3 text-[#0D6EFD]" /> Flip
              </button>
              
              <div className="w-px h-4 bg-[#CBD5E1] mx-1 shrink-0"></div>

              <button
                onClick={() => alert("Brightness/Contrast filter")}
                className="px-2 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] font-bold text-[10px] border border-[#E2E8F0] flex items-center gap-1 shrink-0 cursor-pointer"
                title="Brightness +10%"
              >
                <Sun className="w-3 h-3 text-[#EAB308]" /> Brightness
              </button>

              <button
                onClick={() => alert("Brightness/Contrast filter")}
                className="px-2 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] font-bold text-[10px] border border-[#E2E8F0] flex items-center gap-1 shrink-0 cursor-pointer"
                title="Contrast +10%"
              >
                <Contrast className="w-3 h-3 text-[#14B8A6]" /> Contrast
              </button>
              
              <button
                onClick={() => alert("Sharpness filter applied")}
                className="px-2 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] font-bold text-[10px] border border-[#E2E8F0] flex items-center gap-1 shrink-0 cursor-pointer"
                title="Sharpness"
              >
                <Focus className="w-3 h-3 text-[#EF4444]" /> Sharpness
              </button>
              
              <button
                onClick={() => alert("Background Removal AI initialized")}
                className="px-2 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] font-bold text-[10px] border border-[#E2E8F0] flex items-center gap-1 shrink-0 cursor-pointer"
                title="Background Remove"
              >
                <Eraser className="w-3 h-3 text-[#F97316]" /> BG Remove
              </button>

              <div className="w-px h-4 bg-[#CBD5E1] mx-1 shrink-0"></div>

              <button
                onClick={handleSnapPassport}
                className="px-2 py-1 rounded-lg bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#198754] font-bold text-[10px] border border-[#BBF7D0] flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Camera className="w-3 h-3" /> Passport Mode
              </button>
              
              <button
                onClick={handleSnapCR80}
                className="px-2 py-1 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#0D6EFD] font-bold text-[10px] border border-[#BFDBFE] flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <CreditCard className="w-3 h-3" /> PVC Mode
              </button>

              <button
                onClick={handleResetQuad}
                className="p-1.5 rounded-lg bg-[#FFF4EC] hover:bg-[#FED7AA] text-[#EA580C] border border-[#FDBA74] shrink-0 cursor-pointer ml-1"
                title="Reset Crop"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          `; // add some space
    fs.writeFileSync(path, before + replacement + after);
    console.log('Fixed toolbar 2');
  } else {
    console.log('End tag not found');
  }
} else {
  console.log('Start tag not found');
}
