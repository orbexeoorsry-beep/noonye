import { calculatePdfFitScale } from '../src/features/book-viewer/pdf-fit-scale';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

// A 390px phone with 24px page gutters should render a standard 595pt page at
// the same scale as its actual on-screen width (rather than clipping it).
const phoneScale = calculatePdfFitScale(595, 390, 1);
assert(Math.abs(phoneScale * 595 - 366) < 0.01, '390px viewport fits standard page within 24px gutters');
assert(Math.abs(calculatePdfFitScale(420, 390, 1) * 420 - 366) < 0.01, 'different-width citation page also fits without cropping');
assert(Math.abs(calculatePdfFitScale(595, 600, 1) * 595 - 576) < 0.01, 'resize recomputes fit scale within same page gutters');
assert(Math.abs(calculatePdfFitScale(595, 390, 1.5) * 595 - 549) < 0.01, 'manual zoom scales from fitted baseline');
assert(Math.abs(calculatePdfFitScale(595, 390, 0.8) * 595 - 292.8) < 0.01, 'manual zoom out remains relative to fitted baseline');
