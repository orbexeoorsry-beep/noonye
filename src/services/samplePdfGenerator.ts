/**
 * SamplePdfGenerator
 * Programmatically generates a 100% valid, legal, standards-compliant multi-page
 * PDF document with authentic educational layout, vector diagrams, and typography.
 * Completely offline, zero copyright issues, instant loading in PDF.js.
 */

export function generateEducationalSamplePdf(): Uint8Array {
  // Page 1 Content: Science & Cell Biology (Header, lipid bilayer vectors, protein channel, questions)
  const page1Stream = `
q
% Background paper styling
0.98 0.98 0.99 rg
0 0 595 842 re f

% Top Header Bar
0.1 0.15 0.25 rg
40 790 515 2 re f

% Header Text
BT
/F1 14 Tf
0.1 0.15 0.25 rg
40 802 Td
(NOON LEARNING - SCIENCE & BIOLOGY CURRICULUM) Tj
ET

BT
/F1 10 Tf
0.4 0.45 0.55 rg
480 802 Td
(PAGE 1 / 3) Tj
ET

% Chapter & Lesson Banner
BT
/F1 20 Tf
0.08 0.2 0.45 rg
40 750 Td
(Chapter 3: Cell Membrane & Active Transport) Tj
ET

BT
/F1 11 Tf
0.2 0.2 0.2 rg
40 725 Td
(Lesson 2: Selective Permeability & Lipid Bilayer Model) Tj
ET

% Paragraph box
0.94 0.96 0.98 rg
40 640 515 65 re f
0.75 0.82 0.92 RG
1 w
40 640 515 65 re s

BT
/F1 10 Tf
0.15 0.2 0.3 rg
50 685 Td
(The plasma membrane demonstrates selective permeability, allowing small molecules) Tj
0 -16 Td
(such as oxygen and water to diffuse freely while regulating polar and large molecules.) Tj
0 -16 Td
(Active transport utilizes ATP energy to pump ions against concentration gradients.) Tj
ET

% Figure Box
0.99 0.99 1.0 rg
40 400 515 220 re f
0.8 0.85 0.9 RG
1.5 w
40 400 515 220 re s

BT
/F1 11 Tf
0.1 0.2 0.4 rg
50 598 Td
(Figure 3-4: Fluid Mosaic Model of Plasma Membrane) Tj
ET

% Vector Cell Membrane Drawing
% Extracellular banner
0.93 0.95 0.98 rg
50 550 495 24 re f
BT
/F1 9 Tf
0.4 0.45 0.55 rg
210 558 Td
([ Extracellular Fluid - Na+ Rich ]) Tj
ET

% Cytoplasm banner
0.93 0.95 0.98 rg
50 415 495 24 re f
BT
/F1 9 Tf
0.4 0.45 0.55 rg
225 423 Td
([ Cytoplasm - K+ Rich ]) Tj
ET

% Membrane Bilayer (Lipid heads & tails)
0.1 0.55 0.8 rg
65 525 25 14 re f
105 525 25 14 re f
145 525 25 14 re f
185 525 25 14 re f
375 525 25 14 re f
415 525 25 14 re f
455 525 25 14 re f
495 525 25 14 re f

0.1 0.55 0.8 rg
65 450 25 14 re f
105 450 25 14 re f
145 450 25 14 re f
185 450 25 14 re f
375 450 25 14 re f
415 450 25 14 re f
455 450 25 14 re f
495 450 25 14 re f

% Central Transporter Protein
0.45 0.2 0.7 rg
240 445 105 100 re f
0.3 0.1 0.5 RG
2 w
240 445 105 100 re s

BT
/F1 10 Tf
1 1 1 rg
255 490 Td
(Carrier Protein) Tj
ET

% Question box
0.99 0.97 0.93 rg
40 260 515 115 re f
0.92 0.75 0.5 RG
1.5 w
40 260 515 115 re s

BT
/F1 11 Tf
0.6 0.35 0.1 rg
50 355 Td
(Exercise 3.2: Critical Thinking & Analysis) Tj
ET

BT
/F1 10 Tf
0.2 0.2 0.2 rg
50 330 Td
(1. What is the direct energy source utilized by the Sodium-Potassium ATPase pump?) Tj
0 -18 Td
(   A) Thermal Energy              B) ATP Hydrolysis) Tj
0 -16 Td
(   C) Glucose Simple Diffusion    D) Solar Radiation) Tj
0 -20 Td
(2. Explain why the hydrophobic tails face inward away from aqueous solutions.) Tj
ET

% Footer rule & text
0.8 0.8 0.8 RG
40 70 m 555 70 l S
BT
/F1 9 Tf
0.5 0.5 0.5 rg
40 55 Td
(Noon Learning Platform - Interactive Authentic Textbook Viewer Prototype) Tj
ET
Q
`;

  // Page 2 Content: Mathematics & Quadratic Functions
  const page2Stream = `
q
% Background paper styling
0.98 0.98 0.99 rg
0 0 595 842 re f

% Top Header Bar
0.1 0.15 0.25 rg
40 790 515 2 re f

BT
/F1 14 Tf
0.1 0.15 0.25 rg
40 802 Td
(NOON LEARNING - MATHEMATICS & ALGEBRA) Tj
ET

BT
/F1 10 Tf
0.4 0.45 0.55 rg
480 802 Td
(PAGE 2 / 3) Tj
ET

BT
/F1 20 Tf
0.15 0.15 0.5 rg
40 750 Td
(Unit 2: Quadratic Equations & Parabolic Graphs) Tj
ET

BT
/F1 11 Tf
0.2 0.2 0.2 rg
40 725 Td
(Lesson 1: The General Quadratic Formula & Discriminant Analysis) Tj
ET

% Formula Box
0.95 0.95 0.98 rg
40 625 515 80 re f
0.4 0.4 0.75 RG
2 w
40 625 515 80 re s

BT
/F1 12 Tf
0.1 0.1 0.4 rg
50 680 Td
(Standard Quadratic Formula:  x = [ -b +/- sqrt(b^2 - 4ac) ] / 2a) Tj
ET

BT
/F1 10 Tf
0.3 0.3 0.4 rg
50 650 Td
(Where Delta = b^2 - 4ac determines root nature: Delta > 0 (Two roots), Delta = 0 (One root)) Tj
ET

% Graph Canvas
0.99 0.99 1.0 rg
40 370 515 235 re f
0.8 0.8 0.85 RG
1 w
40 370 515 235 re s

% Coordinate Grid
0.9 0.9 0.92 RG
1 w
100 390 m 100 580 l S
160 390 m 160 580 l S
220 390 m 220 580 l S
280 390 m 280 580 l S
340 390 m 340 580 l S
400 390 m 400 580 l S
460 390 m 460 580 l S

% Coordinate Axes
0.2 0.25 0.3 RG
2 w
60 460 m 530 460 l S
280 380 m 280 590 l S

BT
/F1 10 Tf
0.2 0.25 0.3 rg
520 465 Td
(X) Tj
ET

BT
/F1 10 Tf
0.2 0.25 0.3 rg
285 580 Td
(Y) Tj
ET

% Parabola Curve: y = (x-2)^2 - 1
0.1 0.3 0.85 RG
3 w
160 560 m
220 450 280 430 340 450 c
400 560 l S

% Vertex Point
0.85 0.15 0.15 rg
280 430 4 0 360 arc fill
BT
/F1 9 Tf
0.8 0.1 0.1 rg
290 425 Td
(Vertex (2, -1)) Tj
ET

% Roots
0.1 0.65 0.3 rg
220 460 4 0 360 arc fill
340 460 4 0 360 arc fill
BT
/F1 9 Tf
0.1 0.6 0.3 rg
200 468 Td
(x = 1) Tj
345 468 Td
(x = 3) Tj
ET

% Step-by-Step Example Box
0.96 0.98 0.96 rg
40 180 515 170 re f
0.7 0.85 0.7 RG
1.5 w
40 180 515 170 re s

BT
/F1 11 Tf
0.1 0.5 0.2 rg
50 330 Td
(Worked Example: Solve x^2 - 4x + 3 = 0) Tj
ET

BT
/F1 10 Tf
0.2 0.2 0.2 rg
50 305 Td
(Step 1: Identify coefficients: a = 1, b = -4, c = 3) Tj
0 -18 Td
(Step 2: Calculate Discriminant: Delta = (-4)^2 - 4(1)(3) = 16 - 12 = 4) Tj
0 -18 Td
(Step 3: Since Delta > 0, there are two distinct real solutions.) Tj
0 -18 Td
(Step 4: Substitute into formula: x = [ 4 +/- sqrt(4) ] / 2 = [ 4 +/- 2 ] / 2) Tj
0 -18 Td
(Conclusion: Solutions are x = 3 and x = 1) Tj
ET

% Footer rule & text
0.8 0.8 0.8 RG
40 70 m 555 70 l S
BT
/F1 9 Tf
0.5 0.5 0.5 rg
40 55 Td
(Noon Learning Platform - Mathematics Unit 2 Verified Educational Materials) Tj
ET
Q
`;

  // Page 3 Content: Geography & Water Resources
  const page3Stream = `
q
% Background paper styling
0.98 0.98 0.99 rg
0 0 595 842 re f

% Top Header Bar
0.1 0.15 0.25 rg
40 790 515 2 re f

BT
/F1 14 Tf
0.1 0.15 0.25 rg
40 802 Td
(NOON LEARNING - GEOGRAPHY & ARAB WORLD) Tj
ET

BT
/F1 10 Tf
0.4 0.45 0.55 rg
480 802 Td
(PAGE 3 / 3) Tj
ET

BT
/F1 20 Tf
0.05 0.4 0.3 rg
40 750 Td
(Unit 1: Natural Topography & Freshwater Resources) Tj
ET

BT
/F1 11 Tf
0.2 0.2 0.2 rg
40 725 Td
(Lesson 3: The Nile River Basin and Water Flow Dynamics) Tj
ET

% Geography Map Box
0.94 0.98 0.96 rg
40 450 515 250 re f
0.6 0.8 0.7 RG
1.5 w
40 450 515 250 re s

BT
/F1 11 Tf
0.1 0.4 0.25 rg
50 678 Td
(Map 1-7: Nile Basin Elevation & Tributary Flow) Tj
ET

% River Vector Line
0.15 0.5 0.85 RG
4 w
280 470 m
285 520 270 560 280 610 c
285 640 275 660 280 680 c S

% Blue Nile tributary
0.2 0.6 0.9 RG
2.5 w
370 560 m
330 580 300 590 280 610 c S

% Labels
BT
/F1 9 Tf
0.1 0.3 0.7 rg
210 670 Td
(Mediterranean Sea) Tj
ET

BT
/F1 9 Tf
0.6 0.4 0.1 rg
365 550 Td
(Ethiopian Plateau [84% Flow]) Tj
ET

BT
/F1 9 Tf
0.1 0.4 0.7 rg
230 465 Td
(Lake Victoria Source) Tj
ET

BT
/F1 9 Tf
0.3 0.1 0.5 rg
290 610 Td
(Khartoum Confluence) Tj
ET

% Statistics Table Box
0.98 0.98 0.98 rg
40 230 515 190 re f
0.8 0.8 0.8 RG
1 w
40 230 515 190 re s

% Table Header Row
0.15 0.25 0.35 rg
40 390 515 30 re f
BT
/F1 10 Tf
1 1 1 rg
55 400 Td
(Water Source) Tj
200 400 Td
(Seasonality) Tj
340 400 Td
(Percentage Contribution) Tj
ET

% Table Rows
BT
/F1 9 Tf
0.2 0.2 0.2 rg
55 370 Td
(Blue Nile River (Ethiopia)) Tj
200 370 Td
(Summer Monsoon (Heavy)) Tj
340 370 Td
(59% of Total Annual Yield) Tj

55 340 Td
(Atbarah River) Tj
200 340 Td
(Seasonal Summer Flood) Tj
340 340 Td
(14% of Total Annual Yield) Tj

55 310 Td
(White Nile (Equatorial Lakes)) Tj
200 310 Td
(Permanent Year-Round) Tj
340 310 Td
(16% of Total Annual Yield) Tj

55 280 Td
(Sobat River) Tj
200 280 Td
(Seasonal Rainfall) Tj
340 280 Td
(11% of Total Annual Yield) Tj
ET

% Row Dividers
0.88 0.88 0.88 RG
0.5 w
40 360 m 555 360 l S
40 330 m 555 330 l S
40 300 m 555 300 l S
40 270 m 555 270 l S

% Review Questions
0.99 0.97 0.93 rg
40 90 515 120 re f
0.9 0.75 0.5 RG
1.5 w
40 90 515 120 re s

BT
/F1 11 Tf
0.6 0.3 0.1 rg
50 190 Td
(Key Review Questions) Tj
ET

BT
/F1 10 Tf
0.2 0.2 0.2 rg
50 165 Td
(1. Why does the Ethiopian Plateau provide the predominant share of Nile waters?) Tj
0 -18 Td
(2. What is the geographic significance of the confluence at Khartoum?) Tj
0 -18 Td
(3. Analyze the impact of seasonal rainfall on water storage management.) Tj
ET

% Footer rule & text
0.8 0.8 0.8 RG
40 70 m 555 70 l S
BT
/F1 9 Tf
0.5 0.5 0.5 rg
40 55 Td
(Noon Learning Platform - Arab World Geography Course Curriculum) Tj
ET
Q
`;

  // Object table assembly
  const objects: string[] = [];

  // Obj 1: Catalog
  objects[1] = `1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj`;

  // Obj 2: Pages
  objects[2] = `2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R 4 0 R 5 0 R]
  /Count 3
>>
endobj`;

  // Obj 7: Font Helvetica-Bold
  objects[7] = `7 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica-Bold
>>
endobj`;

  // Obj 6: Content 1
  const cleanStream1 = page1Stream.trim();
  objects[6] = `6 0 obj
<<
  /Length ${cleanStream1.length}
>>
stream
${cleanStream1}
endstream
endobj`;

  // Obj 3: Page 1
  objects[3] = `3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 595 842]
  /Contents 6 0 R
  /Resources <<
    /Font <<
      /F1 7 0 R
    >>
  >>
>>
endobj`;

  // Obj 8: Content 2
  const cleanStream2 = page2Stream.trim();
  objects[8] = `8 0 obj
<<
  /Length ${cleanStream2.length}
>>
stream
${cleanStream2}
endstream
endobj`;

  // Obj 4: Page 2
  objects[4] = `4 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 595 842]
  /Contents 8 0 R
  /Resources <<
    /Font <<
      /F1 7 0 R
    >>
  >>
>>
endobj`;

  // Obj 9: Content 3
  const cleanStream3 = page3Stream.trim();
  objects[9] = `9 0 obj
<<
  /Length ${cleanStream3.length}
>>
stream
${cleanStream3}
endstream
endobj`;

  // Obj 5: Page 3
  objects[5] = `5 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 595 842]
  /Contents 9 0 R
  /Resources <<
    /Font <<
      /F1 7 0 R
    >>
  >>
>>
endobj`;

  // Assemble PDF file binary string
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  let body = header;
  const xrefOffsets: number[] = [0];

  for (let i = 1; i <= 9; i++) {
    xrefOffsets[i] = body.length;
    body += objects[i] + '\n';
  }

  const startXref = body.length;
  let xref = `xref
0 10
0000000000 65535 f \n`;

  for (let i = 1; i <= 9; i++) {
    const offsetStr = String(xrefOffsets[i]).padStart(10, '0');
    xref += `${offsetStr} 00000 n \n`;
  }

  const trailer = `trailer
<<
  /Size 10
  /Root 1 0 R
>>
startxref
${startXref}
%%EOF\n`;

  const fullPdfString = body + xref + trailer;

  // Convert to Uint8Array binary
  const binary = new Uint8Array(fullPdfString.length);
  for (let i = 0; i < fullPdfString.length; i++) {
    binary[i] = fullPdfString.charCodeAt(i) & 0xff;
  }

  return binary;
}
