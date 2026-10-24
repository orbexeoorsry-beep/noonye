import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  adaptPdfJsLoadingTask,
  cancelPdfLoad,
  pdfService,
  type PdfLoadingTaskFactory,
} from '../src/services/pdfService';

test('revoking the viewer load signal cancels its PDF.js loading task', async () => {
  const controller = new AbortController();
  let destroyCalls = 0;
  let rejectTask!: (reason: Error) => void;
  let signalTaskCreated!: () => void;
  const taskCreated = new Promise<void>((resolve) => {
    signalTaskCreated = resolve;
  });

  const mockLoadingTaskFactory: PdfLoadingTaskFactory = () => {
    const promise = new Promise<never>((_resolve, reject) => {
      rejectTask = reject;
    });
    signalTaskCreated();
    return adaptPdfJsLoadingTask({
      promise,
      destroy: async () => {
        destroyCalls += 1;
        rejectTask(new Error('mock loading task cancelled'));
      },
    });
  };

  const loading = pdfService.loadDocument(
    Uint8Array.from([37, 80, 68, 70]),
    controller.signal,
    mockLoadingTaskFactory
  );
  await taskCreated;
  const rejected = assert.rejects(loading, /mock loading task cancelled/);

  // PdfViewer calls this same helper from its effect cleanup when the scope is
  // revoked by logout/401, the component unmounts, or the account changes.
  cancelPdfLoad(controller);
  await rejected;

  assert.equal(destroyCalls, 1, 'the native PDF.js loading task is destroyed exactly once');
});
