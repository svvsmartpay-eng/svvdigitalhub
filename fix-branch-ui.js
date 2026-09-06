const fs = require('fs');
let bl = fs.readFileSync('apps/web/src/pages/branches/BranchListPage.tsx', 'utf8');

// Add Last Seen to the Branch Card UI
const oldCardHeader = `                {b.whatsappNumber ? (
                  b.sessionStatus === 'CONNECTED' ? (
                    <div className="bg-green-50 text-green-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider border border-green-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                      WhatsApp Connected
                    </div>
                  ) : (
                    <div className="bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider border border-amber-200">
                      WhatsApp Disconnected
                    </div>
                  )
                ) : (
                  <div className="bg-gray-100 text-gray-500 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider border border-gray-200">
                    Not Configured
                  </div>
                )}`;

const newCardHeader = `
                <div className="flex flex-col items-end gap-1">
                  {b.whatsappNumber ? (
                    b.sessionStatus === 'CONNECTED' ? (
                      <>
                        <div className="bg-green-50 text-green-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider border border-green-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                          WhatsApp Connected
                        </div>
                        {b.lastSeen && <span className="text-[9px] text-gray-400 font-medium">Last seen: {new Date(b.lastSeen).toLocaleTimeString()}</span>}
                      </>
                    ) : (
                      <div className="bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider border border-amber-200">
                        WhatsApp Disconnected
                      </div>
                    )
                  ) : (
                    <div className="bg-gray-100 text-gray-500 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider border border-gray-200">
                      Not Configured
                    </div>
                  )}
                </div>
`;

bl = bl.replace(oldCardHeader, newCardHeader);

// Inject Temporary Diagnostics Panel
const statsCards = `{/* Stats Cards */}`;
const debugPanel = `
      {/* Temporary Diagnostics Panel (Step 9) */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mb-4 shadow-sm">
        <h4 className="font-bold text-yellow-800 text-xs mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> DEBUG: WhatsApp Session Status (Admin Only)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px] text-gray-700">
            <thead>
              <tr className="border-b border-yellow-200">
                <th className="pb-1 font-bold">Branch ID</th>
                <th className="pb-1 font-bold">Name</th>
                <th className="pb-1 font-bold">Configured WA #</th>
                <th className="pb-1 font-bold">Session State</th>
                <th className="pb-1 font-bold">Last Sync (Seen)</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(b => (
                <tr key={'debug-'+b.id} className="border-b border-yellow-100/50">
                  <td className="py-1 font-mono text-gray-500">{b.id.substring(0,8)}...</td>
                  <td className="py-1">{b.name}</td>
                  <td className="py-1 font-mono">{b.whatsappNumber || <span className="text-red-400 italic">Missing</span>}</td>
                  <td className="py-1">
                    <span className={\`px-1.5 py-0.5 rounded \${b.sessionStatus === 'CONNECTED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}\`}>
                      {b.sessionStatus || 'NONE'}
                    </span>
                  </td>
                  <td className="py-1 font-mono text-gray-500">{b.lastSeen ? new Date(b.lastSeen).toLocaleString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
`;
bl = bl.replace(statsCards, debugPanel + '\n      ' + statsCards);

fs.writeFileSync('apps/web/src/pages/branches/BranchListPage.tsx', bl);
console.log('Fixed BranchListPage UI (Card + Debug Panel)');
