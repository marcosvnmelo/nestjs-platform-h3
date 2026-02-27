import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { App } from 'supertest/types';
import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { UploadModule } from '../src/upload/upload.module';

describe('File Upload (H3 adapter)', () => {
  let server: App;
  let app: NestH3Application;
  const uploadDir = path.join(os.tmpdir(), 'h3-upload-test');

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [UploadModule],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Single file upload', () => {
    it('should upload a single file successfully', async () => {
      const response = await request(server)
        .post('/upload/single')
        .attach('file', Buffer.from('Hello, World!'), 'test.txt')
        .expect(201);

      expect(response.body).toMatchObject({
        fieldname: 'file',
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 13,
        content: 'Hello, World!',
      });
    });

    it('should handle missing file gracefully', async () => {
      const response = await request(server)
        .post('/upload/single')
        .send({})
        .expect(201);

      expect(response.body).toEqual({ message: 'No file uploaded' });
    });
  });

  describe('Multiple files upload', () => {
    it('should upload multiple files from same field', async () => {
      const response = await request(server)
        .post('/upload/multiple')
        .attach('files', Buffer.from('File 1'), 'file1.txt')
        .attach('files', Buffer.from('File 2'), 'file2.txt')
        .expect(201);

      expect(response.body.count).toBe(2);
      expect(response.body.files).toHaveLength(2);
      expect(response.body.files[0]).toMatchObject({
        fieldname: 'files',
        originalname: 'file1.txt',
        content: 'File 1',
      });
      expect(response.body.files[1]).toMatchObject({
        fieldname: 'files',
        originalname: 'file2.txt',
        content: 'File 2',
      });
    });

    it('should handle no files uploaded', async () => {
      const response = await request(server)
        .post('/upload/multiple')
        .send({})
        .expect(201);

      expect(response.body).toEqual({
        message: 'No files uploaded',
        count: 0,
      });
    });
  });

  describe('File fields upload', () => {
    it('should upload files from multiple fields', async () => {
      const response = await request(server)
        .post('/upload/fields')
        .attach('avatar', Buffer.from('Avatar content'), 'avatar.png')
        .attach('documents', Buffer.from('Doc 1'), 'doc1.pdf')
        .attach('documents', Buffer.from('Doc 2'), 'doc2.pdf')
        .expect(201);

      expect(response.body.avatar).toHaveLength(1);
      expect(response.body.avatar[0]).toMatchObject({
        fieldname: 'avatar',
        originalname: 'avatar.png',
        content: 'Avatar content',
      });

      expect(response.body.documents).toHaveLength(2);
      expect(response.body.documents[0]).toMatchObject({
        fieldname: 'documents',
        originalname: 'doc1.pdf',
        content: 'Doc 1',
      });
      expect(response.body.documents[1]).toMatchObject({
        fieldname: 'documents',
        originalname: 'doc2.pdf',
        content: 'Doc 2',
      });
    });
  });

  describe('Any files upload', () => {
    it('should accept files from any field', async () => {
      const response = await request(server)
        .post('/upload/any')
        .attach('file1', Buffer.from('Content 1'), 'a.txt')
        .attach('file2', Buffer.from('Content 2'), 'b.txt')
        .attach('anotherField', Buffer.from('Content 3'), 'c.txt')
        .expect(201);

      expect(response.body.count).toBe(3);
      expect(response.body.files).toHaveLength(3);
    });
  });

  describe('File size limits', () => {
    it('should reject files exceeding size limit', async () => {
      // Create a buffer larger than 100 bytes
      const largeContent = 'x'.repeat(200);

      const response = await request(server)
        .post('/upload/with-limits')
        .attach('file', Buffer.from(largeContent), 'large.txt')
        .expect(413);

      expect(response.body.message).toContain('File too large');
    });

    it('should accept files within size limit', async () => {
      const smallContent = 'small';

      const response = await request(server)
        .post('/upload/with-limits')
        .attach('file', Buffer.from(smallContent), 'small.txt')
        .expect(201);

      expect(response.body).toMatchObject({
        fieldname: 'file',
        originalname: 'small.txt',
        size: 5,
      });
    });
  });

  // =====================================================
  // FORM FIELD PARSING TESTS
  // =====================================================

  describe('Form field parsing', () => {
    it('should extract form fields with @UploadedFields decorator', async () => {
      const response = await request(server)
        .post('/upload/with-form-fields')
        .attach('file', Buffer.from('File content'), 'test.txt')
        .field('username', 'john_doe')
        .field('email', 'john@example.com')
        .expect(201);

      expect(response.body.file).toMatchObject({
        fieldname: 'file',
        originalname: 'test.txt',
      });
      expect(response.body.fields).toHaveLength(2);
      expect(response.body.fields).toEqual(
        expect.arrayContaining([
          { fieldname: 'username', value: 'john_doe' },
          { fieldname: 'email', value: 'john@example.com' },
        ]),
      );
    });

    it('should extract form fields as object with @FormBody decorator', async () => {
      const response = await request(server)
        .post('/upload/form-body')
        .attach('file', Buffer.from('File content'), 'test.txt')
        .field('username', 'jane_doe')
        .field('age', '25')
        .expect(201);

      expect(response.body.body).toEqual({
        username: 'jane_doe',
        age: '25',
      });
    });

    it('should extract individual form fields with @FormField decorator', async () => {
      const response = await request(server)
        .post('/upload/form-field')
        .attach('file', Buffer.from('File content'), 'test.txt')
        .field('username', 'alice')
        .field('email', 'alice@example.com')
        .expect(201);

      expect(response.body.username).toBe('alice');
      expect(response.body.email).toBe('alice@example.com');
    });

    it('should handle missing form fields gracefully', async () => {
      const response = await request(server)
        .post('/upload/form-field')
        .attach('file', Buffer.from('File content'), 'test.txt')
        .expect(201);

      expect(response.body.username).toBeUndefined();
      expect(response.body.email).toBeUndefined();
    });

    it('should parse form fields without file using NoFilesInterceptor', async () => {
      const response = await request(server)
        .post('/upload/no-files')
        .field('name', 'Test User')
        .field('description', 'A test description')
        .expect(201);

      expect(response.body.fields).toHaveLength(2);
      expect(response.body.fields).toEqual(
        expect.arrayContaining([
          { fieldname: 'name', value: 'Test User' },
          { fieldname: 'description', value: 'A test description' },
        ]),
      );
    });
  });

  // =====================================================
  // DISK STORAGE TESTS
  // =====================================================

  describe('Disk storage', () => {
    it('should upload file to disk with custom filename', async () => {
      const response = await request(server)
        .post('/upload/disk-storage')
        .attach('file', Buffer.from('Disk content'), 'disk-file.txt')
        .expect(201);

      expect(response.body.fieldname).toBe('file');
      expect(response.body.originalname).toBe('disk-file.txt');
      expect(response.body.size).toBe(12);
      expect(response.body.hasPath).toBe(true);
      expect(response.body.destination).toBe(uploadDir);
      expect(response.body.filename).toContain('disk-file.txt');

      // Verify file exists on disk
      const filePath = response.body.path;
      expect(fs.existsSync(filePath)).toBe(true);

      // Clean up
      fs.unlinkSync(filePath);
    });

    it('should upload multiple files to disk', async () => {
      const response = await request(server)
        .post('/upload/disk-storage-multiple')
        .attach('files', Buffer.from('File A'), 'a.txt')
        .attach('files', Buffer.from('File B'), 'b.txt')
        .expect(201);

      expect(response.body.count).toBe(2);
      expect(response.body.files).toHaveLength(2);

      for (const file of response.body.files) {
        expect(file.hasPath).toBe(true);
        expect(file.destination).toBe(uploadDir);
        expect(fs.existsSync(file.path)).toBe(true);

        // Clean up
        fs.unlinkSync(file.path);
      }
    });

    it('should upload files from any field to disk', async () => {
      const response = await request(server)
        .post('/upload/disk-storage-any')
        .attach('image', Buffer.from('Image data'), 'image.png')
        .attach('document', Buffer.from('Doc data'), 'doc.pdf')
        .expect(201);

      expect(response.body.count).toBe(2);

      for (const file of response.body.files) {
        expect(file.hasPath).toBe(true);
        expect(fs.existsSync(file.path)).toBe(true);

        // Clean up
        fs.unlinkSync(file.path);
      }
    });

    it('should use dest shorthand for disk storage', async () => {
      const response = await request(server)
        .post('/upload/dest-shorthand')
        .attach('file', Buffer.from('Dest test'), 'dest-file.txt')
        .expect(201);

      expect(response.body.hasPath).toBe(true);
      expect(response.body.destination).toBe(uploadDir);

      // Clean up - find file in upload dir with random name
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        if (file.includes('dest-file.txt') || file.length === 32) {
          try {
            fs.unlinkSync(path.join(uploadDir, file));
          } catch {
            // ignore
          }
        }
      }
    });
  });

  // =====================================================
  // STREAM PROCESSING WITH FORM FIELDS
  // =====================================================

  describe('Stream processing with form fields', () => {
    it('should extract both file and form fields using stream interceptor', async () => {
      const response = await request(server)
        .post('/upload/stream-with-fields')
        .attach('file', Buffer.from('Stream content'), 'stream.txt')
        .field('title', 'My Upload')
        .field('category', 'documents')
        .expect(201);

      expect(response.body.file).toMatchObject({
        fieldname: 'file',
        originalname: 'stream.txt',
        hasPath: true,
      });
      expect(response.body.fields).toHaveLength(2);
      expect(response.body.fields).toEqual(
        expect.arrayContaining([
          { fieldname: 'title', value: 'My Upload' },
          { fieldname: 'category', value: 'documents' },
        ]),
      );

      // Clean up uploaded file
      const uploadedFiles = fs.readdirSync(uploadDir);
      for (const file of uploadedFiles) {
        try {
          fs.unlinkSync(path.join(uploadDir, file));
        } catch {
          // ignore
        }
      }
    });

    it('should handle form fields only without file in stream mode', async () => {
      const response = await request(server)
        .post('/upload/stream-with-fields')
        .field('metadata', 'some metadata')
        .expect(201);

      expect(response.body.file).toBeNull();
      expect(response.body.fields).toHaveLength(1);
      expect(response.body.fields[0]).toEqual({
        fieldname: 'metadata',
        value: 'some metadata',
      });
    });

    it('should upload a single file using FileStreamInterceptor', async () => {
      const response = await request(server)
        .post('/upload/stream-single')
        .attach(
          'file',
          Buffer.from('Single stream content'),
          'single-stream.txt',
        )
        .field('kind', 'single')
        .expect(201);

      expect(response.body.file).toMatchObject({
        fieldname: 'file',
        originalname: 'single-stream.txt',
        content: 'Single stream content',
      });
      expect(response.body.fields).toContainEqual({
        fieldname: 'kind',
        value: 'single',
      });
    });

    it('should upload max two files using FilesStreamInterceptor', async () => {
      const response = await request(server)
        .post('/upload/stream-multiple')
        .attach('files', Buffer.from('stream file 1'), 'stream-1.txt')
        .attach('files', Buffer.from('stream file 2'), 'stream-2.txt')
        .attach('files', Buffer.from('stream file 3'), 'stream-3.txt')
        .field('bucket', 'many')
        .expect(201);

      expect(response.body.count).toBe(2);
      expect(response.body.files).toHaveLength(2);
      expect(response.body.files[0]).toMatchObject({
        fieldname: 'files',
        originalname: 'stream-1.txt',
      });
      expect(response.body.files[1]).toMatchObject({
        fieldname: 'files',
        originalname: 'stream-2.txt',
      });
      expect(response.body.fields).toContainEqual({
        fieldname: 'bucket',
        value: 'many',
      });
    });

    it('should upload files from any field using AnyFilesStreamInterceptor', async () => {
      const response = await request(server)
        .post('/upload/stream-any')
        .attach('avatar', Buffer.from('avatar'), 'avatar.png')
        .attach('document', Buffer.from('doc'), 'document.pdf')
        .field('owner', 'test-user')
        .expect(201);

      expect(response.body.count).toBe(2);
      expect(response.body.files).toHaveLength(2);
      expect(
        response.body.files.map(
          (file: { fieldname: string }) => file.fieldname,
        ),
      ).toEqual(expect.arrayContaining(['avatar', 'document']));
      expect(response.body.fields).toContainEqual({
        fieldname: 'owner',
        value: 'test-user',
      });
    });
  });
});
