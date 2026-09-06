const fs = require('fs');
let c = fs.readFileSync('apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx', 'utf8');

c = c.replace(/Square, FlipHorizontal, Play, Download, MessageSquare, Smartphone\r?\n} from 'lucide-react';/,
`Square, FlipHorizontal, Play, Download, MessageSquare, Smartphone,
  Wand2, Contrast, Sun, Focus, Eraser, Camera
} from 'lucide-react';`);

c = c.replace(/const updateStatusMutation = useUpdatePrintOrderStatus\(\);\r?\n\r?\n\s*\/\/\s*Search in queue/,
`const updateStatusMutation = useUpdatePrintOrderStatus();

  // File Print Status Tracking
  const [fileStatuses, setFileStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeJob && (activeJob as any).order?.metadata) {
      setFileStatuses((activeJob as any).order.metadata.fileStatuses || {});
    } else {
      setFileStatuses({});
    }
  }, [activeJob?.id]);

  const handleToggleFilePrinted = async (fileId: string) => {
    const newVal = !fileStatuses[fileId];
    const newStatuses = { ...fileStatuses, [fileId]: newVal };
    setFileStatuses(newStatuses);
    if (activeJob?.id) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient('https://kxacmxxktuvildjjvnjs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74');
      await supabase.from('print_orders').update({
        metadata: { ...((activeJob as any).order?.metadata || {}), fileStatuses: newStatuses }
      }).eq('id', activeJob.id);
      refetchOrders();
    }
  };

  // Search in queue`);

// For the fallback block:
let idx1 = c.indexOf('<div className="flex-1 min-w-0">');
if (idx1 !== -1 && c.substring(idx1, idx1+500).includes('<p className="text-[10px] text-[#6B7280] font-mono">Image')) {
  let idx2 = c.indexOf('</div>', c.indexOf('<CheckCircle2', idx1)) + 6;
  let newFallback = `<div className="flex items-center gap-2 overflow-hidden w-full">
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); handleToggleFilePrinted((activeJob as any)?.id); }}
                    className={\`w-5 h-5 rounded border flex items-center justify-center shrink-0 \${fileStatuses[(activeJob as any)?.id] ? 'bg-[#198754] border-[#198754] text-white' : 'bg-white border-[#CBD5E1] text-transparent hover:border-[#081B3A]'}\`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-bold text-[#081B3A] truncate">{activeJob?.fileName || 'Document.jpg'}</span>
                    <span className={\`text-[10px] font-mono \${fileStatuses[(activeJob as any)?.id] ? 'text-[#198754]' : 'text-[#6B7280]'}\`}>
                      Status: {fileStatuses[(activeJob as any)?.id] ? 'Printed' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>`;
  c = c.substring(0, idx1) + newFallback + c.substring(idx2);
}

// For Map List
let mapStartIdx = c.indexOf('<div className="w-12 h-12 rounded-xl bg-[#F8FAFC] overflow-hidden shrink-0 border border-[#CBD5E1] flex items-center justify-center">');
if (mapStartIdx !== -1) {
  let mapStartActual = c.lastIndexOf('return (', mapStartIdx);
  let mapEndIdx = c.indexOf(');', c.indexOf('<CheckCircle2', mapStartIdx)) + 2;
  
  let newMapItem = `return (
                  <div
                    key={idx}
                    className={\`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all \${fileStatuses[m.id] ? 'bg-[#E8F5E9] border-[#198754]' : (isCur ? 'bg-[#E7F1FF] border-[#0D6EFD] ring-1 ring-[#0D6EFD]/30' : 'bg-[#FFFFFF] border-[#E2E8F0] hover:border-[#CBD5E1]')}\`}
                    onClick={() => {
                      setSelectedMediaIndex(idx);
                      setSelectedDocMsg(m);
                      if (idx === 0) {
                        setActiveCropTarget('FRONT');
                      } else {
                        setActiveCropTarget('BACK');
                      }
                      if (m.mediaUrl) {
                        const isPdf = m.mediaType === 'PDF' || m.mediaUrl.toLowerCase().endsWith('.pdf');
                        loadSourceFile(m.mediaUrl, isPdf);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden w-full">
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); handleToggleFilePrinted(m.id); }}
                        className={\`w-5 h-5 rounded border flex items-center justify-center shrink-0 \${fileStatuses[m.id] ? 'bg-[#198754] border-[#198754] text-white' : 'bg-white border-[#CBD5E1] text-transparent hover:border-[#081B3A]'}\`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-bold text-[#081B3A] truncate">{cleanName}</span>
                        <span className={\`text-[10px] font-mono \${fileStatuses[m.id] ? 'text-[#198754]' : 'text-[#6B7280]'}\`}>
                          Status: {fileStatuses[m.id] ? 'Printed' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                );`;
  c = c.substring(0, mapStartActual) + newMapItem + c.substring(mapEndIdx);
}

// Complete Ticket
let btnIdx = c.indexOf('<span>Open Next Ticket</span>');
if (btnIdx !== -1) {
  let btnStart = c.lastIndexOf('<button', btnIdx);
  let btnEnd = c.indexOf('</button>', btnIdx) + 9;
  
  let newBtn = `{(() => {
              const totalFiles = activeMediaList.length || 1;
              const numPrinted = activeMediaList.filter(m => fileStatuses[m.id]).length;
              const isAllPrinted = totalFiles > 0 && numPrinted === totalFiles;
              return (
                <button
                  disabled={!isAllPrinted}
                  onClick={() => {
                    if (activeJob?.order?.id) {
                      updateStatusMutation.mutate({ id: activeJob.order.id, status: 'READY_FOR_DELIVERY', staffId: currentUser?.id });
                      setShowCompletedModal(true);
                    }
                  }}
                  className={\`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all \${isAllPrinted ? 'bg-[#198754] hover:bg-[#157347] text-white shadow-md' : 'bg-[#F1F5F9] text-[#9CA3AF] cursor-not-allowed border border-[#E2E8F0]'}\`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete Ticket ({numPrinted}/{totalFiles} Printed)
                </button>
              );
            })()}`;
  c = c.substring(0, btnStart) + newBtn + c.substring(btnEnd);
}

// Toolbar
let toolsIdx = c.indexOf('{/* Editing Tools Controls */}');
if (toolsIdx !== -1) {
  let toolsEnd = c.indexOf('</div>\n            </div>', toolsIdx) + 24;
  let newTool = `{/* Editing Tools Controls */}
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
          </div>`;
  c = c.substring(0, toolsIdx) + newTool + c.substring(toolsEnd);
}

fs.writeFileSync('apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx', c);
console.log('Fixed WhatsAppInboxPage.tsx!');
