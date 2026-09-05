import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Crop,
  Sliders,
  Sparkles,
  RotateCw,
  RefreshCw,
  Check,
  Move,
  CreditCard,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

export interface QuadCorners {
  tl: { x: number; y: number };
  tr: { x: number; y: number };
  br: { x: number; y: number };
  bl: { x: number; y: number };
}

export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CropResult {
  dataUrl: string;
  cropBox: CropBox;
  quad: QuadCorners;
  rotation: number;
}

interface CropStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  initialTarget?: 'FRONT' | 'BACK';
  initialQuad?: QuadCorners;
  initialCropBox?: CropBox;
  initialRotation?: number;
  onApplyCrop: (result: CropResult, targetSide: 'FRONT' | 'BACK') => void;
}

export const CropStudioModal: React.FC<CropStudioModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  initialTarget = 'FRONT',
  initialQuad,
  initialCropBox,
  initialRotation = 0,
  onApplyCrop,
}) => {
  const [targetSide, setTargetSide] = useState<'FRONT' | 'BACK'>(initialTarget);
  const [cropMode, setCropMode] = useState<'FREE_TRANSFORM' | 'SCANNER_CORNER_PERSPECTIVE'>('SCANNER_CORNER_PERSPECTIVE');
  const [aspectPreset, setAspectPreset] = useState<'CR80' | 'A4' | 'FREE'>('CR80');
  const [rotation, setRotation] = useState<number>(initialRotation);

  const [filterBrightness, setFilterBrightness] = useState<number>(100);
  const [filterContrast, setFilterContrast] = useState<number>(100);
  const [filterMode, setFilterMode] = useState<'ORIGINAL' | 'VIBRANT' | 'CLEAN_BW' | 'DOC_WHITE'>('ORIGINAL');

  // Precision zoom & pan state for edge fine-tuning
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isAutoZoomed, setIsAutoZoomed] = useState<boolean>(false);

  const [quad, setQuad] = useState<QuadCorners>(
    initialQuad || {
      tl: { x: 5, y: 8 },
      tr: { x: 95, y: 8 },
      br: { x: 95, y: 92 },
      bl: { x: 5, y: 92 },
    }
  );

  const [cropBox, setCropBox] = useState<CropBox>(
    initialCropBox || { x: 5, y: 8, w: 90, h: 84 }
  );

  const [dragMode, setDragMode] = useState<
    | 'NONE'
    | 'MOVE_BOX'
    | 'RESIZE_NW'
    | 'RESIZE_NE'
    | 'RESIZE_SE'
    | 'RESIZE_SW'
    | 'DRAG_CORNER_TL'
    | 'DRAG_CORNER_TR'
    | 'DRAG_CORNER_BR'
    | 'DRAG_CORNER_BL'
    | 'DRAG_MOVE_QUAD'
  >('NONE');

  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialBoxOnDrag, setInitialBoxOnDrag] = useState<CropBox>({ x: 0, y: 0, w: 0, h: 0 });
  const [initialQuadOnDrag, setInitialQuadOnDrag] = useState<QuadCorners>({
    tl: { x: 0, y: 0 },
    tr: { x: 0, y: 0 },
    br: { x: 0, y: 0 },
    bl: { x: 0, y: 0 },
  });

  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const livePreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setTargetSide(initialTarget);
  }, [initialTarget]);

  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    setImageLoaded(false);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setIsAutoZoomed(false);

    const img = new Image();
    if (!imageUrl.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      setSourceImage(img);
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [isOpen, imageUrl]);

  // Compute bounding box for current selection to allow auto-zoom
  const getSelectionBounds = useCallback(() => {
    if (cropMode === 'SCANNER_CORNER_PERSPECTIVE') {
      const minX = Math.min(quad.tl.x, quad.bl.x, quad.tr.x, quad.br.x);
      const maxX = Math.max(quad.tl.x, quad.bl.x, quad.tr.x, quad.br.x);
      const minY = Math.min(quad.tl.y, quad.bl.y, quad.tr.y, quad.br.y);
      const maxY = Math.max(quad.tl.y, quad.tr.y, quad.bl.y, quad.br.y);
      return {
        x: minX,
        y: minY,
        w: Math.max(1, maxX - minX),
        h: Math.max(1, maxY - minY),
        cx: (minX + maxX) / 2,
        cy: (minY + maxY) / 2,
      };
    } else {
      return {
        x: cropBox.x,
        y: cropBox.y,
        w: cropBox.w,
        h: cropBox.h,
        cx: cropBox.x + cropBox.w / 2,
        cy: cropBox.y + cropBox.h / 2,
      };
    }
  }, [cropMode, quad, cropBox]);

  // Auto-Zoom to current selection so crop zone fills the canvas viewport
  const handleAutoZoomToSelection = useCallback(() => {
    const bounds = getSelectionBounds();
    const scaleX = 82 / bounds.w;
    const scaleY = 82 / bounds.h;
    const targetZoom = Math.min(3.0, Math.max(1.15, Math.min(scaleX, scaleY)));

    const targetPanX = -(bounds.cx - 50) * targetZoom;
    const targetPanY = -(bounds.cy - 50) * targetZoom;

    setZoomLevel(Number(targetZoom.toFixed(2)));
    setPanOffset({ x: Number(targetPanX.toFixed(1)), y: Number(targetPanY.toFixed(1)) });
    setIsAutoZoomed(true);
  }, [getSelectionBounds]);

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setIsAutoZoomed(false);
  };

  const applyAspectPreset = (preset: 'CR80' | 'A4' | 'FREE') => {
    setAspectPreset(preset);
    if (preset === 'CR80') {
      const w = 85;
      const h = 54;
      const x = (100 - w) / 2;
      const y = (100 - h) / 2;
      setCropBox({ x, y, w, h });
      setQuad({
        tl: { x, y },
        tr: { x: x + w, y },
        br: { x: x + w, y: y + h },
        bl: { x, y: y + h },
      });
    } else if (preset === 'A4') {
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
    } else {
      setCropBox({ x: 5, y: 5, w: 90, h: 90 });
      setQuad({
        tl: { x: 5, y: 5 },
        tr: { x: 95, y: 5 },
        br: { x: 95, y: 95 },
        bl: { x: 5, y: 95 },
      });
    }
  };

  const handleReset = () => {
    setRotation(0);
    setFilterBrightness(100);
    setFilterContrast(100);
    setFilterMode('ORIGINAL');
    handleResetZoom();
    applyAspectPreset('CR80');
  };

  const handleAutoDetect = () => {
    if (!sourceImage) return;
    try {
      const offCanvas = document.createElement('canvas');
      const sampleW = 320;
      const sampleH = Math.round((sourceImage.height / sourceImage.width) * sampleW);
      offCanvas.width = sampleW;
      offCanvas.height = sampleH;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(sourceImage, 0, 0, sampleW, sampleH);
      const idata = ctx.getImageData(0, 0, sampleW, sampleH);
      const data = idata.data;

      let minX = sampleW, maxX = 0, minY = sampleH, maxY = 0;
      const cornerR = data[0], cornerG = data[1], cornerB = data[2];
      for (let y = 5; y < sampleH - 5; y += 4) {
        for (let x = 5; x < sampleW - 5; x += 4) {
          const idx = (y * sampleW + x) * 4;
          const diff = Math.abs(data[idx] - cornerR) + Math.abs(data[idx + 1] - cornerG) + Math.abs(data[idx + 2] - cornerB);
          if (diff > 45) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX > minX + 20 && maxY > minY + 20) {
        const xPct = Math.max(2, Math.round((minX / sampleW) * 100) - 1);
        const yPct = Math.max(2, Math.round((minY / sampleH) * 100) - 1);
        const rPct = Math.min(98, Math.round((maxX / sampleW) * 100) + 1);
        const bPct = Math.min(98, Math.round((maxY / sampleH) * 100) + 1);

        setQuad({
          tl: { x: xPct, y: yPct },
          tr: { x: rPct, y: yPct },
          br: { x: rPct, y: bPct },
          bl: { x: xPct, y: bPct },
        });
        setCropBox({
          x: xPct,
          y: yPct,
          w: rPct - xPct,
          h: bPct - yPct,
        });

        // Automatically zoom into the detected boundary
        setTimeout(() => {
          const bounds = {
            w: rPct - xPct,
            h: bPct - yPct,
            cx: (xPct + rPct) / 2,
            cy: (yPct + bPct) / 2,
          };
          const scaleX = 82 / bounds.w;
          const scaleY = 82 / bounds.h;
          const targetZoom = Math.min(2.5, Math.max(1.15, Math.min(scaleX, scaleY)));
          const targetPanX = -(bounds.cx - 50) * targetZoom;
          const targetPanY = -(bounds.cy - 50) * targetZoom;
          setZoomLevel(Number(targetZoom.toFixed(2)));
          setPanOffset({ x: Number(targetPanX.toFixed(1)), y: Number(targetPanY.toFixed(1)) });
          setIsAutoZoomed(true);
        }, 50);
      } else {
        applyAspectPreset('CR80');
      }
    } catch {
      applyAspectPreset('CR80');
    }
  };

  const handleMouseDown = (
    e: React.MouseEvent,
    mode: typeof dragMode
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
    const mouseY = ((e.clientY - rect.top) / rect.height) * 100;

    setDragMode(mode);
    setDragStart({ x: mouseX, y: mouseY });
    setInitialBoxOnDrag({ ...cropBox });
    setInitialQuadOnDrag({
      tl: { ...quad.tl },
      tr: { ...quad.tr },
      br: { ...quad.br },
      bl: { ...quad.bl },
    });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragMode === 'NONE' || !containerRef.current) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const mouseY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const dx = mouseX - dragStart.x;
    const dy = mouseY - dragStart.y;

    if (dragMode === 'DRAG_CORNER_TL') {
      setQuad((prev) => ({ ...prev, tl: { x: mouseX, y: mouseY } }));
    } else if (dragMode === 'DRAG_CORNER_TR') {
      setQuad((prev) => ({ ...prev, tr: { x: mouseX, y: mouseY } }));
    } else if (dragMode === 'DRAG_CORNER_BR') {
      setQuad((prev) => ({ ...prev, br: { x: mouseX, y: mouseY } }));
    } else if (dragMode === 'DRAG_CORNER_BL') {
      setQuad((prev) => ({ ...prev, bl: { x: mouseX, y: mouseY } }));
    } else if (dragMode === 'DRAG_MOVE_QUAD') {
      const clampX = (val: number) => Math.max(0, Math.min(100, val));
      const clampY = (val: number) => Math.max(0, Math.min(100, val));
      setQuad({
        tl: { x: clampX(initialQuadOnDrag.tl.x + dx), y: clampY(initialQuadOnDrag.tl.y + dy) },
        tr: { x: clampX(initialQuadOnDrag.tr.x + dx), y: clampY(initialQuadOnDrag.tr.y + dy) },
        br: { x: clampX(initialQuadOnDrag.br.x + dx), y: clampY(initialQuadOnDrag.br.y + dy) },
        bl: { x: clampX(initialQuadOnDrag.bl.x + dx), y: clampY(initialQuadOnDrag.bl.y + dy) },
      });
    }

    if (dragMode === 'MOVE_BOX') {
      const newX = Math.max(0, Math.min(100 - initialBoxOnDrag.w, initialBoxOnDrag.x + dx));
      const newY = Math.max(0, Math.min(100 - initialBoxOnDrag.h, initialBoxOnDrag.y + dy));
      setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
    } else if (dragMode === 'RESIZE_SE') {
      const newW = Math.max(10, Math.min(100 - initialBoxOnDrag.x, initialBoxOnDrag.w + dx));
      const newH = Math.max(10, Math.min(100 - initialBoxOnDrag.y, initialBoxOnDrag.h + dy));
      setCropBox((prev) => ({ ...prev, w: newW, h: newH }));
    } else if (dragMode === 'RESIZE_NW') {
      const newX = Math.max(0, Math.min(initialBoxOnDrag.x + initialBoxOnDrag.w - 10, initialBoxOnDrag.x + dx));
      const newY = Math.max(0, Math.min(initialBoxOnDrag.y + initialBoxOnDrag.h - 10, initialBoxOnDrag.y + dy));
      const newW = initialBoxOnDrag.w - (newX - initialBoxOnDrag.x);
      const newH = initialBoxOnDrag.h - (newY - initialBoxOnDrag.y);
      setCropBox({ x: newX, y: newY, w: newW, h: newH });
    } else if (dragMode === 'RESIZE_NE') {
      const newY = Math.max(0, Math.min(initialBoxOnDrag.y + initialBoxOnDrag.h - 10, initialBoxOnDrag.y + dy));
      const newW = Math.max(10, Math.min(100 - initialBoxOnDrag.x, initialBoxOnDrag.w + dx));
      const newH = initialBoxOnDrag.h - (newY - initialBoxOnDrag.y);
      setCropBox((prev) => ({ ...prev, y: newY, w: newW, h: newH }));
    } else if (dragMode === 'RESIZE_SW') {
      const newX = Math.max(0, Math.min(initialBoxOnDrag.x + initialBoxOnDrag.w - 10, initialBoxOnDrag.x + dx));
      const newW = initialBoxOnDrag.w - (newX - initialBoxOnDrag.x);
      const newH = Math.max(10, Math.min(100 - initialBoxOnDrag.y, initialBoxOnDrag.h + dy));
      setCropBox((prev) => ({ ...prev, x: newX, w: newW, h: newH }));
    }
  }, [dragMode, dragStart, initialBoxOnDrag, initialQuadOnDrag]);

  const handleMouseUp = () => {
    setDragMode('NONE');
  };

  const renderTriangle = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x0: number, y0: number,
    x1: number, y1: number,
    x2: number, y2: number,
    u0: number, v0: number,
    u1: number, v1: number,
    u2: number, v2: number
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.clip();

    const denom = u0 * (v1 - v2) - u1 * v0 + u1 * v2 + u2 * v0 - u2 * v1;
    if (Math.abs(denom) > 0.0001) {
      const a = (x0 * (v1 - v2) - x1 * v0 + x1 * v2 + x2 * v0 - x2 * v1) / denom;
      const c = -(x0 * (u1 - u2) - x1 * u0 + x1 * u2 + x2 * u0 - x2 * u1) / denom;
      const e = (x0 * (u1 * v2 - u2 * v1) - x1 * (u0 * v2 - u2 * v0) + x2 * (u0 * v1 - u1 * v0)) / denom;

      const b = (y0 * (v1 - v2) - y1 * v0 + y1 * v2 + y2 * v0 - y2 * v1) / denom;
      const d = -(y0 * (u1 - u2) - y1 * u0 + y1 * u2 + y2 * u0 - y2 * u1) / denom;
      const f = (y0 * (u1 * v2 - u2 * v1) - y1 * (u0 * v2 - u2 * v0) + y2 * (u0 * v1 - u1 * v0)) / denom;

      ctx.transform(a, b, c, d, e, f);
      ctx.drawImage(img, 0, 0);
    }
    ctx.restore();
  };

  const renderMesh = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    q: QuadCorners,
    destW: number,
    destH: number
  ) => {
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;

    const p0 = { x: (q.tl.x / 100) * imgW, y: (q.tl.y / 100) * imgH };
    const p1 = { x: (q.tr.x / 100) * imgW, y: (q.tr.y / 100) * imgH };
    const p2 = { x: (q.br.x / 100) * imgW, y: (q.br.y / 100) * imgH };
    const p3 = { x: (q.bl.x / 100) * imgW, y: (q.bl.y / 100) * imgH };

    const GRID = 16;
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const u0 = gx / GRID;
        const u1 = (gx + 1) / GRID;
        const v0 = gy / GRID;
        const v1 = (gy + 1) / GRID;

        const dx0 = u0 * destW;
        const dx1 = u1 * destW;
        const dy0 = v0 * destH;
        const dy1 = v1 * destH;

        const srcPt = (u: number, v: number) => {
          const topX = p0.x + u * (p1.x - p0.x);
          const topY = p0.y + u * (p1.y - p0.y);
          const botX = p3.x + u * (p2.x - p3.x);
          const botY = p3.y + u * (p2.y - p3.y);
          return {
            x: topX + v * (botX - topX),
            y: topY + v * (botY - topY),
          };
        };

        const pt00 = srcPt(u0, v0);
        const pt10 = srcPt(u1, v0);
        const pt01 = srcPt(u0, v1);
        const pt11 = srcPt(u1, v1);

        renderTriangle(ctx, img, dx0, dy0, dx1, dy0, dx0, dy1, pt00.x, pt00.y, pt10.x, pt10.y, pt01.x, pt01.y);
        renderTriangle(ctx, img, dx1, dy0, dx1, dy1, dx0, dy1, pt10.x, pt10.y, pt11.x, pt11.y, pt01.x, pt01.y);
      }
    }
  };

  const renderOutputToCanvas = useCallback(
    (canvas: HTMLCanvasElement) => {
      if (!sourceImage) return;
      let targetW = 1012;
      let targetH = 638;

      if (aspectPreset === 'A4') {
        targetW = 1240;
        targetH = 1754;
      } else if (aspectPreset === 'FREE') {
        const imgW = sourceImage.naturalWidth || sourceImage.width;
        const imgH = sourceImage.naturalHeight || sourceImage.height;
        const sw = Math.max(10, (cropBox.w / 100) * imgW);
        const sh = Math.max(10, (cropBox.h / 100) * imgH);
        const aspect = sw / sh;
        targetW = 1200;
        targetH = Math.round(1200 / aspect);
      }

      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.filter = `brightness(${filterBrightness}%) contrast(${filterContrast}%) ${
        filterMode === 'CLEAN_BW'
          ? 'grayscale(100%) contrast(150%)'
          : filterMode === 'DOC_WHITE'
          ? 'contrast(200%) brightness(120%)'
          : filterMode === 'VIBRANT'
          ? 'saturate(135%) contrast(110%)'
          : 'none'
      }`;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (cropMode === 'SCANNER_CORNER_PERSPECTIVE') {
        renderMesh(ctx, sourceImage, quad, canvas.width, canvas.height);
      } else {
        const imgW = sourceImage.naturalWidth || sourceImage.width;
        const imgH = sourceImage.naturalHeight || sourceImage.height;
        const sx = Math.max(0, (cropBox.x / 100) * imgW);
        const sy = Math.max(0, (cropBox.y / 100) * imgH);
        const sw = Math.max(10, Math.min(imgW - sx, (cropBox.w / 100) * imgW));
        const sh = Math.max(10, Math.min(imgH - sy, (cropBox.h / 100) * imgH));

        ctx.save();
        if (rotation === 90 || rotation === 270) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.drawImage(sourceImage, sx, sy, sw, sh, -canvas.height / 2, -canvas.width / 2, canvas.height, canvas.width);
        } else if (rotation === 180) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(Math.PI);
          ctx.drawImage(sourceImage, sx, sy, sw, sh, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        } else {
          ctx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        }
        ctx.restore();
      }
    },
    [sourceImage, aspectPreset, cropBox, quad, cropMode, rotation, filterBrightness, filterContrast, filterMode]
  );

  useEffect(() => {
    if (!isOpen || !sourceImage || !livePreviewCanvasRef.current) return;
    renderOutputToCanvas(livePreviewCanvasRef.current);
  }, [isOpen, sourceImage, quad, cropBox, cropMode, rotation, filterBrightness, filterContrast, filterMode, aspectPreset, renderOutputToCanvas]);

  const handleApply = () => {
    if (!sourceImage) return;
    const finalCanvas = document.createElement('canvas');
    renderOutputToCanvas(finalCanvas);
    const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.98);

    onApplyCrop(
      {
        dataUrl,
        cropBox,
        quad,
        rotation,
      },
      targetSide
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in select-none p-2 sm:p-3">
      <div className="bg-[#FFFFFF] w-full h-full max-w-[98vw] max-h-[96vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#CBD5E1]">
        {/* HEADER */}
        <div className="h-14 px-5 bg-[#081B3A] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-white/10 text-white">
              <Crop className="w-5 h-5 text-[#0D6EFD]" />
            </span>
            <div>
              <h2 className="text-sm font-bold tracking-wide">Modern Crop Studio & Edge Scanner</h2>
              <p className="text-[10px] text-gray-300">Pinpoint accuracy, high-contrast dimming & auto-zoom</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/10 p-1 rounded-xl text-xs font-bold mr-3">
              <button
                type="button"
                onClick={() => setTargetSide('FRONT')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  targetSide === 'FRONT' ? 'bg-[#198754] text-white shadow-xs' : 'text-gray-300 hover:text-white'
                }`}
              >
                🪪 Front Side
              </button>
              <button
                type="button"
                onClick={() => setTargetSide('BACK')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  targetSide === 'BACK' ? 'bg-[#0D6EFD] text-white shadow-xs' : 'text-gray-300 hover:text-white'
                }`}
              >
                🔄 Back Side
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOOLBAR STRIP */}
        <div className="h-13 bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-1.5 bg-[#FFFFFF] p-1 rounded-xl border border-[#CBD5E1] shadow-2xs">
            <button
              onClick={() => setCropMode('SCANNER_CORNER_PERSPECTIVE')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                cropMode === 'SCANNER_CORNER_PERSPECTIVE'
                  ? 'bg-[#0D6EFD] text-white shadow-xs'
                  : 'text-[#495057] hover:bg-[#F1F5F9]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> 4-Corner Scanner
            </button>
            <button
              onClick={() => setCropMode('FREE_TRANSFORM')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                cropMode === 'FREE_TRANSFORM'
                  ? 'bg-[#0D6EFD] text-white shadow-xs'
                  : 'text-[#495057] hover:bg-[#F1F5F9]'
              }`}
            >
              <Crop className="w-3.5 h-3.5" /> Normal Crop
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#FFFFFF] p-1 rounded-xl border border-[#CBD5E1] shadow-2xs">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase px-1.5">Preset:</span>
            <button
              onClick={() => applyAspectPreset('CR80')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                aspectPreset === 'CR80' ? 'bg-[#198754] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]'
              }`}
            >
              🪪 CR80 PVC (85.6×54)
            </button>
            <button
              onClick={() => applyAspectPreset('A4')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                aspectPreset === 'A4' ? 'bg-[#6F42C1] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]'
              }`}
            >
              📄 A4 Page
            </button>
            <button
              onClick={() => applyAspectPreset('FREE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                aspectPreset === 'FREE' ? 'bg-[#0D6EFD] text-white' : 'text-[#495057] hover:bg-[#F1F5F9]'
              }`}
            >
              Free Ratio
            </button>
          </div>

          {/* Precision Zoom & Pan Controls */}
          <div className="flex items-center gap-1 bg-[#FFFFFF] p-1 rounded-xl border border-[#CBD5E1] shadow-2xs">
            <button
              onClick={handleAutoZoomToSelection}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                isAutoZoomed ? 'bg-[#081B3A] text-white' : 'text-[#081B3A] hover:bg-[#F1F5F9]'
              }`}
              title="Auto Zoom to crop selection"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#0D6EFD]" />
              <span>Auto Zoom</span>
            </button>
            <div className="h-4 w-[1px] bg-[#E2E8F0]" />
            <button
              onClick={() => {
                setZoomLevel((z) => Math.max(1, Number((z - 0.25).toFixed(2))));
                if (zoomLevel <= 1.25) setPanOffset({ x: 0, y: 0 });
              }}
              className="p-1 rounded-lg hover:bg-[#F1F5F9] text-[#081B3A] cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] font-bold px-1 text-[#081B3A]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))))}
              className="p-1 rounded-lg hover:bg-[#F1F5F9] text-[#081B3A] cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel > 1 && (
              <button
                onClick={handleResetZoom}
                className="text-[10px] text-[#0D6EFD] font-bold px-1 hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAutoDetect}
              className="px-3 py-1.5 rounded-xl bg-[#E8F5E9] hover:bg-[#DCFCE7] text-[#198754] border border-[#86EFAC] font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
              title="Auto Detect Edges"
            >
              <Sparkles className="w-3.5 h-3.5" /> Auto Detect
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="px-2.5 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F1F5F9] text-[#0D6EFD] border border-[#CBD5E1] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
              title="Rotate 90°"
            >
              <RotateCw className="w-3.5 h-3.5" /> 90°
            </button>
            <button
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded-xl bg-[#FFF4EC] hover:bg-[#FED7AA] text-[#EA580C] border border-[#FDBA74] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
              title="Reset Crop"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>

        {/* WORKSPACE BODY - Full Canvas Utilization, Zero Dead Space */}
        <div className="flex-1 flex overflow-hidden bg-[#181E29] relative">
          {/* Main Document Canvas Viewport */}
          <div
            className="flex-1 flex items-center justify-center p-1 sm:p-2 relative overflow-hidden bg-[#111827]"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {imageLoaded && sourceImage ? (
              <div
                ref={containerRef}
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}%, ${panOffset.y / zoomLevel}%)`,
                  transformOrigin: 'center center',
                  transition: dragMode !== 'NONE' ? 'none' : 'transform 0.2s ease-out',
                }}
                className="relative max-w-full max-h-full flex items-center justify-center select-none shadow-2xl rounded-sm overflow-visible"
              >
                <img
                  src={imageUrl}
                  alt="Crop Target"
                  className="max-h-[calc(96vh-120px)] max-w-full object-contain pointer-events-none select-none block shadow-xl"
                  style={{ transform: `rotate(${rotation}deg)` }}
                />

                {/* ── 4-CORNER SCANNER OVERLAY ── */}
                {cropMode === 'SCANNER_CORNER_PERSPECTIVE' && (
                  <div className="absolute inset-0 pointer-events-none z-20">
                    <svg className="w-full h-full absolute inset-0 overflow-visible pointer-events-none">
                      <defs>
                        <mask id="crop-studio-mask">
                          {/* Outer area dimmed with dark overlay */}
                          <rect width="100%" height="100%" fill="white" />
                          {/* Inside crop zone completely transparent / 100% bright */}
                          <polygon
                            points={`
                              ${quad.tl.x}%,${quad.tl.y}%
                              ${quad.tr.x}%,${quad.tr.y}%
                              ${quad.br.x}%,${quad.br.y}%
                              ${quad.bl.x}%,${quad.bl.y}%
                            `}
                            fill="black"
                          />
                        </mask>
                      </defs>

                      {/* Dimmed backdrop outside boundary (72% dark tint for sharp focus) */}
                      <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.72)" mask="url(#crop-studio-mask)" />

                      {/* Crisp thin outline borders connecting corner points */}
                      <polygon
                        points={`
                          ${quad.tl.x}%,${quad.tl.y}%
                          ${quad.tr.x}%,${quad.tr.y}%
                          ${quad.br.x}%,${quad.br.y}%
                          ${quad.bl.x}%,${quad.bl.y}%
                        `}
                        fill="none"
                        stroke="#0D6EFD"
                        strokeWidth="1.5"
                        className="drop-shadow-sm"
                      />

                      {/* Grid cross lines inside crop area for fine alignment */}
                      <line
                        x1={`${(quad.tl.x + quad.bl.x) / 2}%`}
                        y1={`${(quad.tl.y + quad.bl.y) / 2}%`}
                        x2={`${(quad.tr.x + quad.br.x) / 2}%`}
                        y2={`${(quad.tr.y + quad.br.y) / 2}%`}
                        stroke="#0D6EFD"
                        strokeWidth="0.8"
                        strokeDasharray="3 3"
                        strokeOpacity="0.45"
                      />
                      <line
                        x1={`${(quad.tl.x + quad.tr.x) / 2}%`}
                        y1={`${(quad.tl.y + quad.tr.y) / 2}%`}
                        x2={`${(quad.bl.x + quad.br.x) / 2}%`}
                        y2={`${(quad.bl.y + quad.br.y) / 2}%`}
                        stroke="#0D6EFD"
                        strokeWidth="0.8"
                        strokeDasharray="3 3"
                        strokeOpacity="0.45"
                      />
                    </svg>

                    {/* Center Move Handle (Compact) */}
                    <div
                      style={{
                        left: `${(quad.tl.x + quad.tr.x + quad.br.x + quad.bl.x) / 4}%`,
                        top: `${(quad.tl.y + quad.tr.y + quad.br.y + quad.bl.y) / 4}%`,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, 'DRAG_MOVE_QUAD')}
                      className="absolute w-7 h-7 -ml-3.5 -mt-3.5 bg-[#0D6EFD] text-white rounded-full flex items-center justify-center cursor-move shadow-lg pointer-events-auto border border-white/90 hover:scale-115 transition-transform"
                      title="Move Crop Area"
                    >
                      <Move className="w-3.5 h-3.5" />
                    </div>

                    {/* Compact Pinpoint Corner Handles with Crosshair precision */}
                    {[
                      { key: 'DRAG_CORNER_TL' as const, pos: quad.tl, label: 'TL' },
                      { key: 'DRAG_CORNER_TR' as const, pos: quad.tr, label: 'TR' },
                      { key: 'DRAG_CORNER_BR' as const, pos: quad.br, label: 'BR' },
                      { key: 'DRAG_CORNER_BL' as const, pos: quad.bl, label: 'BL' },
                    ].map((corner) => (
                      <div
                        key={corner.key}
                        style={{ left: `${corner.pos.x}%`, top: `${corner.pos.y}%` }}
                        onMouseDown={(e) => handleMouseDown(e, corner.key)}
                        className="absolute w-4.5 h-4.5 -ml-[9px] -mt-[9px] bg-white border-2 border-[#0D6EFD] rounded-full shadow-md cursor-crosshair pointer-events-auto hover:scale-130 transition-transform flex items-center justify-center group"
                      >
                        {/* Pinpoint dot */}
                        <div className="w-1.5 h-1.5 bg-[#0D6EFD] rounded-full group-hover:bg-[#081B3A]" />
                      </div>
                    ))}
                  </div>
                )}

                {/* ── NORMAL CROP (FREE TRANSFORM) OVERLAY ── */}
                {cropMode === 'FREE_TRANSFORM' && (
                  <div className="absolute inset-0 pointer-events-none z-20">
                    <svg className="w-full h-full absolute inset-0 pointer-events-none">
                      <defs>
                        <mask id="crop-box-rect-mask">
                          <rect width="100%" height="100%" fill="white" />
                          <rect x={`${cropBox.x}%`} y={`${cropBox.y}%`} width={`${cropBox.w}%`} height={`${cropBox.h}%`} fill="black" />
                        </mask>
                      </defs>
                      {/* Dimmed backdrop outside normal crop (72% dark overlay for clear focus) */}
                      <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.72)" mask="url(#crop-box-rect-mask)" />
                    </svg>

                    <div
                      style={{
                        left: `${cropBox.x}%`,
                        top: `${cropBox.y}%`,
                        width: `${cropBox.w}%`,
                        height: `${cropBox.h}%`,
                      }}
                      className="absolute border border-[#0D6EFD] pointer-events-auto shadow-md"
                    >
                      {/* Inner 3x3 Grid for rule-of-thirds precision */}
                      <div className="w-full h-full pointer-events-none grid grid-cols-3 grid-rows-3">
                        <div className="border-r border-b border-[#0D6EFD]/25" />
                        <div className="border-r border-b border-[#0D6EFD]/25" />
                        <div className="border-b border-[#0D6EFD]/25" />
                        <div className="border-r border-b border-[#0D6EFD]/25" />
                        <div className="border-r border-b border-[#0D6EFD]/25" />
                        <div className="border-b border-[#0D6EFD]/25" />
                        <div className="border-r border-b border-[#0D6EFD]/25" />
                        <div className="border-r border-b border-[#0D6EFD]/25" />
                        <div />
                      </div>

                      {/* Center Drag Zone */}
                      <div
                        onMouseDown={(e) => handleMouseDown(e, 'MOVE_BOX')}
                        className="absolute inset-0 cursor-move flex items-center justify-center hover:bg-[#0D6EFD]/5"
                        title="Move Box"
                      >
                        <Move className="w-5 h-5 text-white/50 hover:text-white/80 transition-colors" />
                      </div>

                      {/* Compact Corner Handles (Pinpoint) */}
                      <div
                        onMouseDown={(e) => handleMouseDown(e, 'RESIZE_NW')}
                        className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#0D6EFD] rounded-xs cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                      />
                      <div
                        onMouseDown={(e) => handleMouseDown(e, 'RESIZE_NE')}
                        className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#0D6EFD] rounded-xs cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                      />
                      <div
                        onMouseDown={(e) => handleMouseDown(e, 'RESIZE_SE')}
                        className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#0D6EFD] rounded-xs cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                      />
                      <div
                        onMouseDown={(e) => handleMouseDown(e, 'RESIZE_SW')}
                        className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#0D6EFD] rounded-xs cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400 text-sm">Loading document preview...</div>
            )}
          </div>

          <div className="w-72 bg-[#1E293B] border-l border-slate-700 p-4 flex flex-col justify-between shrink-0 text-white overflow-y-auto">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#0D6EFD]" /> Unwarped Live Result
                </span>
                <div className="w-full aspect-[85.6/54] bg-white rounded-xl border border-slate-600 overflow-hidden shadow-inner flex items-center justify-center">
                  <canvas ref={livePreviewCanvasRef} className="w-full h-full object-contain" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 text-center font-mono">
                  {aspectPreset === 'CR80' ? 'CR80 300 DPI (85.6×54mm)' : aspectPreset === 'A4' ? 'A4 Document View' : 'Custom Dimension'}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-700">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Image Filters</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'ORIGINAL', label: '📷 Original' },
                    { id: 'VIBRANT', label: '✨ Vibrant' },
                    { id: 'CLEAN_BW', label: '📄 Clean B&W' },
                    { id: 'DOC_WHITE', label: '🔍 Doc White' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilterMode(f.id as any)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        filterMode === f.id
                          ? 'bg-[#0D6EFD] text-white border-[#0D6EFD]'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Saving to:</span>
                  <strong className={targetSide === 'FRONT' ? 'text-[#86EFAC]' : 'text-[#93C5FD]'}>
                    {targetSide === 'FRONT' ? 'Front Side' : 'Back Side'}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Technique:</span>
                  <strong className="text-white">
                    {cropMode === 'SCANNER_CORNER_PERSPECTIVE' ? 'Perspective Unwarp' : 'Box Crop'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleApply}
                className="w-full py-2.5 rounded-xl bg-[#198754] hover:bg-[#157347] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-[0.99]"
              >
                <Check className="w-4 h-4" /> Apply & Save as {targetSide === 'FRONT' ? 'Front' : 'Back'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
