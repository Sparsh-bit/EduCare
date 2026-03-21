/**
 * Magic-bytes file validation
 *
 * Reads the first 12 bytes of an on-disk file and confirms the content
 * matches the expected file signature — preventing file-extension spoofing
 * (e.g. a .php script renamed to .pdf).
 */

import fs from 'fs';

interface MagicSignature {
    offset: number;
    bytes: number[];
}

// Signatures for the MIME types we accept as student documents.
const SIGNATURES: Record<string, MagicSignature[]> = {
    'application/pdf': [
        { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] },           // %PDF
    ],
    'image/jpeg': [
        { offset: 0, bytes: [0xFF, 0xD8, 0xFF] },                  // JFIF / EXIF
    ],
    'image/png': [
        { offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }, // PNG
    ],
    'image/webp': [
        { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },            // RIFF header (WebP container)
    ],
};

/**
 * Returns true if the file at `filePath` begins with one of the known magic
 * signatures for `declaredMime`.  Always returns true for MIME types that are
 * not in the SIGNATURES table (fail-open for unknown types).
 */
export async function validateMagicBytes(filePath: string, declaredMime: string): Promise<boolean> {
    const sigs = SIGNATURES[declaredMime.toLowerCase()];
    if (!sigs || sigs.length === 0) return true; // no signature known — pass through

    const HEADER_SIZE = 12;
    let header: Buffer;
    try {
        const fd = fs.openSync(filePath, 'r');
        header = Buffer.alloc(HEADER_SIZE);
        fs.readSync(fd, header, 0, HEADER_SIZE, 0);
        fs.closeSync(fd);
    } catch {
        return false; // can't read file → fail safe
    }

    return sigs.some(({ offset, bytes }) =>
        bytes.every((byte, i) => header[offset + i] === byte)
    );
}
