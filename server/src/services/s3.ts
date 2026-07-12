import { Media } from '../models/Media';

/**
 * Uploads a file buffer directly to MongoDB.
 * @param fileBuffer The binary data buffer.
 * @param originalName The file name.
 * @param mimeType The file content type.
 * @returns The key/path/URL identifying the file.
 */
export const uploadFile = async (
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> => {
  const sanitizedName = originalName.replace(/\s+/g, '_');
  const uniqueName = `${Date.now()}_${sanitizedName}`;

  console.log(`[MongoDB Storage] Saving file to database: ${uniqueName}`);
  const media = new Media({
    filename: uniqueName,
    contentType: mimeType,
    data: fileBuffer,
  });

  await media.save();
  console.log(`[MongoDB Storage] Saved file to database successfully: api/media/${media._id}`);
  return `api/media/${media._id}`;
};

/**
 * Returns a secure URL to stream the file from MongoDB.
 * @param fileKey The identifier key/path/URL.
 * @returns The URL string.
 */
export const getSignedFileUrl = async (fileKey: string): Promise<string> => {
  if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
    return fileKey;
  }
  // Return the resolved backend domain host URL
  const host = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  
  // Format the key to ensure there's a leading slash if not present
  const relativePath = fileKey.startsWith('/') ? fileKey : `/${fileKey}`;
  return `${host}${relativePath}`;
};

/**
 * Deletes a file from MongoDB.
 * @param fileKey The identifier key/path/URL.
 */
export const deleteFile = async (fileKey: string): Promise<void> => {
  if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
    console.log(`[Delete File] Skipping deletion for remote URL: ${fileKey}`);
    return;
  }

  // Parse ID from the path (e.g. api/media/:id or /api/media/:id)
  const parts = fileKey.split('/');
  const id = parts[parts.length - 1];
  
  if (id && id.match(/^[0-9a-fA-F]{24}$/)) { // Verify it's a valid MongoDB ObjectId
    console.log(`[MongoDB Storage] Deleting file from database: ${id}`);
    await Media.findByIdAndDelete(id);
  }
};

export default uploadFile;
