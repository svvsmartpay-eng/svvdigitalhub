const fs = require('fs');
const file = 'apps/web/src/components/shared/CropStudioModal.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "const [aspectPreset, setAspectPreset] = useState<'CR80' | 'A4' | 'FREE'>('CR80');",
  "const [aspectPreset, setAspectPreset] = useState<'CR80' | 'A4_PORT' | 'A4_LAND' | 'FREE'>('CR80');"
);
code = code.replace(
  "const applyAspectPreset = (preset: 'CR80' | 'A4' | 'FREE') => {",
  "const applyAspectPreset = (preset: 'CR80' | 'A4_PORT' | 'A4_LAND' | 'FREE') => {"
);

const oldA4Block = "} else if (preset === 'A4') {\n" +
"        const w = 60;\n" +
"        const h = Math.round(w / 0.707);\n" +
"        const x = (100 - w) / 2;\n" +
"        const y = Math.max(2, (100 - h) / 2);\n" +
"        setCropBox({ x, y, w, h: Math.min(96, h) });\n" +
"        setQuad({\n" +
"          tl: { x, y },\n" +
"          tr: { x: x + w, y },\n" +
"          br: { x: x + w, y: y + Math.min(96, h) },\n" +
"          bl: { x, y: y + Math.min(96, h) },\n" +
"        });\n" +
"      }";

const newA4Block = "} else if (preset === 'A4_PORT') {\n" +
"        const w = 60;\n" +
"        const h = Math.round(w / 0.707);\n" +
"        const x = (100 - w) / 2;\n" +
"        const y = Math.max(2, (100 - h) / 2);\n" +
"        setCropBox({ x, y, w, h: Math.min(96, h) });\n" +
"        setQuad({ tl: { x, y }, tr: { x: x + w, y }, br: { x: x + w, y: y + Math.min(96, h) }, bl: { x, y: y + Math.min(96, h) } });\n" +
"      } else if (preset === 'A4_LAND') {\n" +
"        const w = 85;\n" +
"        const h = Math.round(w * 0.707);\n" +
"        const x = (100 - w) / 2;\n" +
"        const y = Math.max(2, (100 - h) / 2);\n" +
"        setCropBox({ x, y, w, h: Math.min(96, h) });\n" +
"        setQuad({ tl: { x, y }, tr: { x: x + w, y }, br: { x: x + w, y: y + Math.min(96, h) }, bl: { x, y: y + Math.min(96, h) } });\n" +
"      }";
code = code.replace(oldA4Block, newA4Block);

const oldRenderBlock = "if (aspectPreset === 'A4') {\n" +
"          targetW = 1240;\n" +
"          targetH = 1754;\n" +
"        }";
const newRenderBlock = "if (aspectPreset === 'A4_PORT') {\n" +
"          targetW = 1240;\n" +
"          targetH = 1754;\n" +
"        } else if (aspectPreset === 'A4_LAND') {\n" +
"          targetW = 1754;\n" +
"          targetH = 1240;\n" +
"        }";
code = code.replace(oldRenderBlock, newRenderBlock);

const oldContainer = "<div className=\"w-full aspect-[85.6/54] bg-white rounded-xl border border-slate-600 overflow-hidden shadow-inner flex items-center justify-center\">";
const newContainer = "<div className={'w-full bg-white rounded-xl border border-slate-600 overflow-hidden shadow-inner flex items-center justify-center ' + (aspectPreset === 'A4_PORT' ? 'aspect-[1/1.414]' : aspectPreset === 'A4_LAND' ? 'aspect-[1.414/1]' : aspectPreset === 'CR80' ? 'aspect-[85.6/54]' : 'aspect-square')}>";
code = code.replace(oldContainer, newContainer);

code = code.replace(
  "aspectPreset === 'A4' ? 'A4 Document View' : 'Custom Dimension'",
  "aspectPreset === 'A4_PORT' ? 'A4 Portrait View' : aspectPreset === 'A4_LAND' ? 'A4 Landscape View' : 'Custom Dimension'"
);

const oldButtons = "<button\n" +
"                onClick={() => applyAspectPreset('A4')}\n" +
"                className={px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer }\n" +
"              >\n" +
"                📄 A4 Page\n" +
"              </button>";
const newButtons = "<button onClick={() => applyAspectPreset('A4_PORT')} className={'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ' + (aspectPreset === 'A4_PORT' ? 'bg-[#6F42C1] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]')}>📄 A4 (Port)</button>\n" +
"              <button onClick={() => applyAspectPreset('A4_LAND')} className={'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ' + (aspectPreset === 'A4_LAND' ? 'bg-[#6F42C1] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]')}>📄 A4 (Land)</button>";
code = code.replace(oldButtons, newButtons);

fs.writeFileSync(file, code, 'utf8');
