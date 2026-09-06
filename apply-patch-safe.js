const fs = require('fs');
const file = 'apps/web/src/components/shared/CropStudioModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. aspectPreset type
code = code.replace(
  "const [aspectPreset, setAspectPreset] = useState<'CR80' | 'A4' | 'FREE'>('CR80');",
  "const [aspectPreset, setAspectPreset] = useState<'CR80' | 'A4_PORT' | 'A4_LAND' | 'FREE'>('CR80');"
);

// 2. applyAspectPreset function signature
code = code.replace(
  "const applyAspectPreset = (preset: 'CR80' | 'A4' | 'FREE') => {",
  "const applyAspectPreset = (preset: 'CR80' | 'A4_PORT' | 'A4_LAND' | 'FREE') => {"
);

// 3. applyAspectPreset logic
const oldA4Preset = "} else if (preset === 'A4') {";
const newA4Preset = `} else if (preset === 'A4_PORT') {
      const w = 60;
      const h = Math.round(w / 0.707);
      const x = (100 - w) / 2;
      const y = Math.max(2, (100 - h) / 2);
      setCropBox({ x, y, w, h: Math.min(96, h) });
      setQuad({
        tl: { x, y },
        tr: { x: x + w, y },
        br: { x: x + w, y: y + Math.min(96, h) },
        bl: { x, y: y + Math.min(96, h) },
      });
    } else if (preset === 'A4_LAND') {
      const w = 85;
      const h = Math.round(w * 0.707);
      const x = (100 - w) / 2;
      const y = Math.max(2, (100 - h) / 2);
      setCropBox({ x, y, w, h: Math.min(96, h) });
      setQuad({
        tl: { x, y },
        tr: { x: x + w, y },
        br: { x: x + w, y: y + Math.min(96, h) },
        bl: { x, y: y + Math.min(96, h) },
      });
    } else if (false) {`;
code = code.replace(oldA4Preset, newA4Preset);

// 4. renderOutputToCanvas logic
const oldRender = "if (aspectPreset === 'A4') {";
const newRender = `if (aspectPreset === 'A4_PORT') {
        targetW = 1240;
        targetH = 1754;
      } else if (aspectPreset === 'A4_LAND') {
        targetW = 1754;
        targetH = 1240;
      } else if (false) {`;
code = code.replace(oldRender, newRender);

// 5. Buttons
code = code.replace(
  /<button\s+onClick=\{\(\) => applyAspectPreset\('CR80'\)\}[\s\S]*?applyAspectPreset\('FREE'\)[\s\S]*?<\/button>/,
  `<button onClick={() => applyAspectPreset('CR80')} className={\`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer \${aspectPreset === 'CR80' ? 'bg-[#198754] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]'}\`}>💳 CR80 PVC</button>
  <button onClick={() => applyAspectPreset('A4_PORT')} className={\`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer \${aspectPreset === 'A4_PORT' ? 'bg-[#6F42C1] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]'}\`}>📄 A4 Port</button>
  <button onClick={() => applyAspectPreset('A4_LAND')} className={\`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer \${aspectPreset === 'A4_LAND' ? 'bg-[#6F42C1] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]'}\`}>📄 A4 Land</button>
  <button onClick={() => applyAspectPreset('FREE')} className={\`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer \${aspectPreset === 'FREE' ? 'bg-[#0D6EFD] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]'}\`}>Free Ratio</button>`
);

// 6. Preview Container
code = code.replace(
  `<div className="w-full aspect-[85.6/54] bg-white rounded-xl border border-slate-600 overflow-hidden shadow-inner flex items-center justify-center">`,
  `<div className={'w-full bg-white rounded-xl border border-slate-600 overflow-hidden shadow-inner flex items-center justify-center ' + (aspectPreset === 'A4_PORT' ? 'aspect-[1/1.414]' : aspectPreset === 'A4_LAND' ? 'aspect-[1.414/1]' : aspectPreset === 'CR80' ? 'aspect-[85.6/54]' : 'aspect-square')}>`
);

// 7. Preview Label
code = code.replace(
  `aspectPreset === 'A4' ? 'A4 Document View'`,
  `aspectPreset === 'A4_PORT' ? 'A4 Portrait View' : aspectPreset === 'A4_LAND' ? 'A4 Landscape View'`
);

// 8. Other stray 'A4' references (like handleAutoDetect fallback)
code = code.replace(/applyAspectPreset\('A4'\)/g, `applyAspectPreset('A4_PORT')`);
code = code.replace(/aspectPreset === 'A4'/g, `aspectPreset === 'A4_PORT'`);

fs.writeFileSync(file, code, 'utf8');
