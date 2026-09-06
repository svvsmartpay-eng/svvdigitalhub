const fs = require('fs');

let content = fs.readFileSync('apps/web/src/pages/dashboard/DashboardPage.tsx', 'utf8');

// Inject the new Role-based metrics if they don't exist
const adminBlock = `{role === 'SUPER_ADMIN' && (
        <div className="mb-8 bg-[#081B3A] text-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">?? Platform Super Admin</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-200">Total Owners / Tenants</div>
              <div className="text-2xl font-black">2</div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-200">Total Branches</div>
              <div className="text-2xl font-black">4</div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-200">Active WhatsApp Hubs</div>
              <div className="text-2xl font-black">2</div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-200">Total Print Tokens</div>
              <div className="text-2xl font-black">156</div>
            </div>
          </div>
        </div>
      )}

      {role === 'ADMIN' && (
        <div className="mb-8 bg-blue-600 text-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">?? Business Owner Dashboard</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-100">My Branches</div>
              <div className="text-2xl font-black">2</div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-100">Total Staff</div>
              <div className="text-2xl font-black">12</div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-100">Today's Print Jobs</div>
              <div className="text-2xl font-black">34</div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-100">Pending Work Orders</div>
              <div className="text-2xl font-black">5</div>
            </div>
          </div>
        </div>
      )}`;

if (!content.includes("Platform Super Admin")) {
    content = content.replace(/(<div className="space-y-6">)/, `$1\n      ${adminBlock}\n`);
}

fs.writeFileSync('apps/web/src/pages/dashboard/DashboardPage.tsx', content);
console.log('Fixed DashboardPage.tsx');
