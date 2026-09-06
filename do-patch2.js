const fs = require('fs');
const file = 'apps/web/src/components/shared/CropStudioModal.tsx';
let code = fs.readFileSync(file, 'utf8');

const s1 = "const [aspectPreset, setAspectPreset] = useState<'CR80' | 'A4' | 'FREE'>('CR80');";
const r1 = "const [aspectPreset, setAspectPreset] = useState<'CR80' | 'A4_PORT' | 'A4_LAND' | 'FREE'>('CR80');";
code = code.split(s1).join(r1);

const s2 = "const applyAspectPreset = (preset: 'CR80' | 'A4' | 'FREE') => {";
const r2 = "const applyAspectPreset = (preset: 'CR80' | 'A4_PORT' | 'A4_LAND' | 'FREE') => {";
code = code.split(s2).join(r2);

const s3 = `      } else if (preset === 'A4') {
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
      }`;
const r3 = `      } else if (preset === 'A4_PORT') {
        const w = 60;
        const h = Math.round(w / 0.707);
        const x = (100 - w) / 2;
        const y = Math.max(2, (100 - h) / 2);
        setCropBox({ x, y, w, h: Math.min(96, h) });
        setQuad({ tl: { x, y }, tr: { x: x + w, y }, br: { x: x + w, y: y + Math.min(96, h) }, bl: { x, y: y + Math.min(96, h) } });
      } else if (preset === 'A4_LAND') {
        const w = 85;
        const h = Math.round(w * 0.707);
        const x = (100 - w) / 2;
        const y = Math.max(2, (100 - h) / 2);
        setCropBox({ x, y, w, h: Math.min(96, h) });
        setQuad({ tl: { x, y }, tr: { x: x + w, y }, br: { x: x + w, y: y + Math.min(96, h) }, bl: { x, y: y + Math.min(96, h) } });
      }`;
code = code.split(s3).join(r3);

const s4 = `        if (aspectPreset === 'A4') {
          targetW = 1240;
          targetH = 1754;
        }`;
const r4 = `        if (aspectPreset === 'A4_PORT') {
          targetW = 1240;
          targetH = 1754;
        } else if (aspectPreset === 'A4_LAND') {
          targetW = 1754;
          targetH = 1240;
        }`;
code = code.split(s4).join(r4);

const s5 = `              <button
                onClick={() => applyAspectPreset('CR80')}
                className={\`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer \${
                  aspectPreset === 'CR80' ? 'bg-[#198754] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]'
                }\`}
              >
                dY CR80 PVC (85.6A-54)
              </button>
              <button
                onClick={() => applyAspectPreset('A4')}
                className={\`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer \${
                  aspectPreset === 'A4' ? 'bg-[#6F42C1] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]'
                }\`}
              >
                dY", A4 Page
              </button>
              <button
                onClick={() => applyAspectPreset('FREE')}
                className={\`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer \${
                  aspectPreset === 'FREE' ? 'bg-[#0D6EFD] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]'
                }\`}
              >
                Free Ratio
              </button>`;
// If the emojis were mangled, let's just use regex for the buttons specifically, but a safe one:
code = code.replace(
  /<button\s+onClick=\{\(\) => applyAspectPreset\('CR80'\)\}[\s\S]*?applyAspectPreset\('FREE'\)[\s\S]*?<\/button>/,
  `<button onClick={() => applyAspectPreset('CR80')} className={\`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer \${aspectPreset === 'CR80' ? 'bg-[#198754] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]'}\`}>💳 CR80 PVC</button>
  <button onClick={() => applyAspectPreset('A4_PORT')} className={\`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer \${aspectPreset === 'A4_PORT' ? 'bg-[#6F42C1] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]'}\`}>📄 A4 Port</button>
  <button onClick={() => applyAspectPreset('A4_LAND')} className={\`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer \${aspectPreset === 'A4_LAND' ? 'bg-[#6F42C1] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]'}\`}>📄 A4 Land</button>
  <button onClick={() => applyAspectPreset('FREE')} className={\`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer \${aspectPreset === 'FREE' ? 'bg-[#0D6EFD] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]'}\`}>Free Ratio</button>`
);

const s6 = `<div className="w-full aspect-[85.6/54] bg-white rounded-xl border border-slate-600 overflow-hidden shadow-inner flex items-center justify-center">`;
const r6 = `<div className={'w-full bg-white rounded-xl border border-slate-600 overflow-hidden shadow-inner flex items-center justify-center ' + (aspectPreset === 'A4_PORT' ? 'aspect-[1/1.414]' : aspectPreset === 'A4_LAND' ? 'aspect-[1.414/1]' : aspectPreset === 'CR80' ? 'aspect-[85.6/54]' : 'aspect-square')}>`;
code = code.split(s6).join(r6);

const s7 = `{aspectPreset === 'CR80' ? 'CR80 300 DPI (85.6A-54mm)' : aspectPreset === 'A4' ? 'A4 Document View' : 'Custom Dimension'}`;
const r7 = `{aspectPreset === 'CR80' ? 'CR80 300 DPI (85.6x54mm)' : aspectPreset === 'A4_PORT' ? 'A4 Portrait View' : aspectPreset === 'A4_LAND' ? 'A4 Landscape View' : 'Custom Dimension'}`;
// If mangled:
code = code.replace(/\{aspectPreset === 'CR80'.*?'Custom Dimension'\}/, r7);

fs.writeFileSync(file, code, 'utf8');
