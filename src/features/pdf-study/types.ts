export interface PdfPageProxyCompatible {
  getTextContent(): Promise<{ items: Array<{ str?: string; [key: string]: unknown }> }>;
}

export interface PdfDocumentProxyCompatible {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageProxyCompatible>;
}

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  status: 'ready' | 'empty' | 'error';
  reason?: string;
}

export interface DocumentExtraction {
  pageCount: number;
  pages: ExtractedPage[];
}

export interface StudyMaterial {
  title: string;
  startPage: number;
  endPage: number;
  summary: Array<{ text: string; pageNumber: number }>;
  questions: Array<{ prompt: string; answer: string; pageNumber: number }>;
  warnings?: string[];
}
