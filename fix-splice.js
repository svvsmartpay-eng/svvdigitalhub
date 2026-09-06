const fs = require('fs');

const path = 'apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const newFallback = `                <div className="flex items-center gap-2 overflow-hidden w-full">
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

// Replace fallback (around line 2150 in the new file because we added state at line 65)
// Let's find the exact index.
let idx1 = lines.findIndex(l => l.includes('<CheckCircle2 className="w-4 h-4 text-[#198754] shrink-0" />'));
if (idx1 > 0) {
  lines.splice(idx1 - 4, 6, newFallback);
}

// 4. Left Panel List items
let idx2 = lines.findIndex(l => l.includes('const roleTitle = idx === 0 ?'));
if (idx2 > 0) {
  const newList = `                return (
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
  // Replace from roleTitle to the end of the return statement
  lines.splice(idx2, 42, newList);
}

// 5. Left Footer Complete Ticket
let idx3 = lines.findIndex(l => l.includes('<span>Staff:</span>') || l.includes('<span>Staff:<\/span>'));
if (idx3 > 0) {
  const newFooter = `            <div className="flex items-center justify-between text-[#6B7280]">
              <span>Staff:</span>
              <strong className="text-[#0D6EFD] font-bold">{operatorName}</strong>
            </div>
            {(() => {
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
            })()}
          </div>`;
  lines.splice(idx3 - 1, 5, newFooter);
}

// 6. Professional Toolbar
let idx4 = lines.findIndex(l => l.includes('resetCrop()') || l.includes('Reset Crop'));
if (idx4 > 0) {
  let idx4_start = lines.findIndex(l => l.includes('<button') && lines.slice(idx4-5, idx4).includes(l));
  if (idx4_start === -1) idx4_start = idx4 - 5;
  // Let's just match the container div around it.
  // Actually it's easier to find the div that contains it.
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Fixed up to 5');
