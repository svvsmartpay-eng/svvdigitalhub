const fs = require('fs');
const file = 'apps/web/src/components/shared/CropStudioModal.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /\} else if \(preset === 'A4_LAND'\) \{[\s\S]*?\} else if \(false\) \{[\s\S]*?bl: \{ x, y: y \+ Math\.min\(96, h\) \},\n\s*\}\);\n\s*\}/;

const correctA4Land = `} else if (preset === 'A4_LAND') {
      const w = 85;
      const h = Math.round(w * 0.707);
      const x = (100 - w) / 2;
      const y = Math.max(2, (100 - h) / 2);
      setCropBox({ x, y, w, h: Math.min(96, h) });
      setQuad({ tl: { x, y }, tr: { x: x + w, y }, br: { x: x + w, y: y + Math.min(96, h) }, bl: { x, y: y + Math.min(96, h) } });
    } else if (preset === 'FREE') {
      setCropBox({ x: 5, y: 5, w: 90, h: 90 });
      setQuad({
        tl: { x: 5, y: 5 },
        tr: { x: 95, y: 5 },
        br: { x: 95, y: 95 },
        bl: { x: 5, y: 95 },
      });
    }`;

code = code.replace(regex, correctA4Land);

fs.writeFileSync(file, code, 'utf8');
