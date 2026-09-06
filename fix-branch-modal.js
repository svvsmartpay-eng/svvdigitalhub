const fs = require('fs');
let content = fs.readFileSync('apps/web/src/pages/branches/BranchListPage.tsx', 'utf8');

// 1. Add email to BranchItem
content = content.replace('phone?: string;', 'phone?: string;\n    email?: string;');

// 2. Add formEmail state
content = content.replace("const [formPhone, setFormPhone] = useState<string>('');", "const [formPhone, setFormPhone] = useState<string>('');\n  const [formEmail, setFormEmail] = useState<string>('');");

// 3. Clear formEmail in handleOpenCreate
content = content.replace("setFormPhone('');", "setFormPhone('');\n      setFormEmail('');");

// 4. Set formEmail in handleOpenEdit
content = content.replace("setFormPhone(b.phone || '');", "setFormPhone(b.phone || '');\n      setFormEmail(b.email || '');");

// 5. Add email to payload (2 places - one in new branch object, one in update object)
// Since `phone: formPhone` is exact, we'll replace the first two occurrences safely using split and join.
let parts = content.split('phone: formPhone,');
if (parts.length === 3) {
  content = parts[0] + 'phone: formPhone,\n        email: formEmail.trim() || undefined,' + parts[1] + 'phone: formPhone,\n          email: formEmail.trim() || undefined,' + parts[2];
}

// 6. Add UI fields to the modal
const newInputs = `
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+91..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-xs"
                    />
                  </div>
                </div>
`;

content = content.replace(
  '<div className="grid grid-cols-2 gap-3">\n                  <div>\n                    <label className="font-bold text-gray-700 block mb-1">WhatsApp Business Number</label>',
  newInputs + '\n                <div className="grid grid-cols-2 gap-3">\n                  <div>\n                    <label className="font-bold text-gray-700 block mb-1">WhatsApp Business Number</label>'
);

fs.writeFileSync('apps/web/src/pages/branches/BranchListPage.tsx', content);
console.log("BranchListPage.tsx modal fixed.");
