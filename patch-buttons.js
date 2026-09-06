const fs = require('fs');
const file = 'apps/web/src/components/shared/CropStudioModal.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /<button[\s\S]*?applyAspectPreset\('A4_PORT'\)[\s\S]*?<\/button>/;
const newButtons = "<button onClick={() => applyAspectPreset('A4_PORT')} className={'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ' + (aspectPreset === 'A4_PORT' ? 'bg-[#6F42C1] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]')}>📄 A4 Port</button>\n<button onClick={() => applyAspectPreset('A4_LAND')} className={'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ' + (aspectPreset === 'A4_LAND' ? 'bg-[#6F42C1] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]')}>📄 A4 Land</button>";
code = code.replace(regex, newButtons);

fs.writeFileSync(file, code, 'utf8');
