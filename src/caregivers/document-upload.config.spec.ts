import { BadRequestException } from '@nestjs/common';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  documentFileFilter,
  documentFilename,
  multerOptions,
} from './document-upload.config';

describe('document upload configuration (RF02.3.2)', () => {
  it('should cap uploads at 5 MB', () => {
    expect(MAX_DOCUMENT_SIZE_BYTES).toBe(5 * 1024 * 1024);
    expect(multerOptions.limits.fileSize).toBe(MAX_DOCUMENT_SIZE_BYTES);
  });

  it('should only whitelist PDF, JPEG and PNG', () => {
    expect(ALLOWED_DOCUMENT_MIME_TYPES).toEqual(['application/pdf', 'image/jpeg', 'image/png']);
  });

  it.each(['application/pdf', 'image/jpeg', 'image/png'])('should accept %s', (mimetype) => {
    const cb = jest.fn();
    documentFileFilter(undefined, { mimetype }, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it.each(['image/gif', 'application/zip', 'text/html', 'application/x-msdownload'])(
    'should reject %s with BadRequestException',
    (mimetype) => {
      const cb = jest.fn();
      documentFileFilter(undefined, { mimetype }, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(BadRequestException), false);
    },
  );

  it('should generate a unique name that keeps the extension but not the original name', () => {
    const results: string[] = [];
    const cb = (_err: Error | null, name: string) => results.push(name);

    documentFilename(undefined, { originalname: '../../etc/passwd.pdf' }, cb);
    documentFilename(undefined, { originalname: '../../etc/passwd.pdf' }, cb);

    expect(results[0]).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(results[0]).not.toContain('passwd');
    expect(results[0]).not.toBe(results[1]);
  });

  it('should expose disk storage and filter on multerOptions', () => {
    expect(multerOptions.storage).toBeDefined();
    expect(multerOptions.fileFilter).toBe(documentFileFilter);
  });
});

describe('document upload directory bootstrap', () => {
  it('should create the upload directory on load when it does not exist', () => {
    const mkdirSync = jest.fn();
    jest.isolateModules(() => {
      jest.doMock('fs', () => ({
        existsSync: jest.fn().mockReturnValue(false),
        mkdirSync,
      }));
      jest.doMock('multer', () => ({ diskStorage: jest.fn().mockReturnValue({}) }));
      require('./document-upload.config');
    });

    expect(mkdirSync).toHaveBeenCalledWith('./uploads/documents', { recursive: true });
    jest.dontMock('fs');
    jest.dontMock('multer');
  });
});
