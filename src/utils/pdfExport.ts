/**
 * Lightweight standard PDF 1.4 exporter for Canvas / Images
 * 100% pure TypeScript, zero external dependencies, standard compliant.
 */

export function createPdfBlobFromJpeg(jpegBytes: Uint8Array, imageWidth: number, imageHeight: number): Blob {
  // Page size in standard PDF points (72 pt per inch)
  // Scale down pixel dimensions while preserving aspect ratio
  const maxDimension = 792; // 11 inches * 72 pt
  const scale = Math.min(maxDimension / imageWidth, maxDimension / imageHeight, 1);
  const pdfWidth = Math.round(imageWidth * scale);
  const pdfHeight = Math.round(imageHeight * scale);

  const contentStream = `q\n${pdfWidth} 0 0 ${pdfHeight} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentLen = contentStream.length;

  const offsets: number[] = [];
  let pdf = '%PDF-1.4\n';

  // Object 1: Catalog
  offsets.push(pdf.length);
  pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  // Object 2: Pages
  offsets.push(pdf.length);
  pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  // Object 3: Page
  offsets.push(pdf.length);
  pdf += `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfWidth} ${pdfHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`;

  // Object 4: Image XObject (Binary stream)
  offsets.push(pdf.length);
  const imgHeader = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`;
  const imgFooter = '\nendstream\nendobj\n';

  // Object 5: Content stream
  const obj5 = `5 0 obj\n<< /Length ${contentLen} >>\nstream\n${contentStream}endstream\nendobj\n`;

  // Calculate binary parts
  const textEncoder = new TextEncoder();
  const part1Bytes = textEncoder.encode(pdf + imgHeader);
  const part1Length = part1Bytes.length;

  const afterImgOffset = part1Length + jpegBytes.length + imgFooter.length;
  offsets.push(afterImgOffset); // Offset of Object 5

  const endOffset = afterImgOffset + textEncoder.encode(obj5).length;

  // Cross-reference table (xref)
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 0; i < 5; i++) {
    const off = i === 3 ? offsets[3] : i === 4 ? afterImgOffset : offsets[i];
    xref += off.toString().padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${endOffset}\n%%EOF\n`;
  const part3Bytes = textEncoder.encode(imgFooter + obj5 + xref + trailer);

  return new Blob([part1Bytes, jpegBytes as any, part3Bytes], { type: 'application/pdf' });
}

/**
 * Export HTMLCanvasElement or Stage to PDF file and trigger download
 */
export async function exportCanvasAsPdf(
  canvas: HTMLCanvasElement,
  fileName: string = 'Design_Export.pdf'
): Promise<void> {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const res = await fetch(dataUrl);
  const buffer = await res.arrayBuffer();
  const jpegBytes = new Uint8Array(buffer);

  const pdfBlob = createPdfBlobFromJpeg(jpegBytes, canvas.width, canvas.height);
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
