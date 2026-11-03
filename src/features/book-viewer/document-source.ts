import type { Book } from '../../types';
import { localDocumentStore, LocalDocumentError } from '../../services/local-document-store';
import { generateEducationalSamplePdf } from '../../services/samplePdfGenerator';

/** Only explicitly designated admin/demo books may use the sample generator. */
export async function loadBookDocumentData(
  book: Pick<Book, 'id' | 'source'>,
  readLocal: (id: string) => Promise<ArrayBuffer | null> = (id) => localDocumentStore.getDocumentData(id),
  generateSample: () => Uint8Array = generateEducationalSamplePdf
): Promise<ArrayBuffer | Uint8Array> {
  if (book.source === 'local') {
    const data = await readLocal(book.id);
    if (!data) throw new LocalDocumentError('missing');
    return data;
  }
  if (book.source === 'admin') return generateSample();
  throw new LocalDocumentError('missing');
}
