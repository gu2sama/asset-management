import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// A4サイズ（mm）
const A4_W = 210;
const A4_H = 297;

export async function generatePdf(
  sections: { key: string; el: HTMLElement | null }[],
  filename: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  // フォントロードを待つ
  await document.fonts.ready;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const valid = sections.filter((s) => s.el !== null);

  for (let i = 0; i < valid.length; i++) {
    onProgress?.(i / valid.length);
    const el = valid[i].el!;

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 8000,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.93);

    if (i > 0) pdf.addPage();

    // アスペクト比を維持しながらA4に収める
    const canvasAspect = canvas.height / canvas.width;
    const imgH = A4_W * canvasAspect;

    if (imgH <= A4_H) {
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_W, imgH);
    } else {
      // 縦が長い場合は縦基準でスケール
      const scaledW = (A4_H / canvasAspect);
      pdf.addImage(imgData, 'JPEG', (A4_W - scaledW) / 2, 0, scaledW, A4_H);
    }
  }

  onProgress?.(1);
  pdf.save(filename);
}
