import fs from 'fs';
import path from 'path';

const isImgBBConfigured = (): boolean => {
  return !!process.env.IMGBB_API_KEY;
};

/**
 * Uploads a file buffer to ImgBB (if it is an image and ImgBB is configured),
 * or saves it locally.
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

  // 1. If it's an image and ImgBB is configured, upload to ImgBB
  if (isImgBBConfigured() && mimeType.startsWith('image/')) {
    try {
      console.log(`[ImgBB Upload] Uploading image: ${uniqueName}`);
      const body = new URLSearchParams();
      body.append('image', fileBuffer.toString('base64'));

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        throw new Error(`ImgBB upload failed with status ${response.status}`);
      }

      const resData: any = await response.json();
      if (resData && resData.data && resData.data.url) {
        console.log(`[ImgBB Upload] Uploaded image successfully: ${resData.data.url}`);
        return resData.data.url;
      } else {
        throw new Error('Invalid response format from ImgBB');
      }
    } catch (error) {
      console.error('[ImgBB Upload] Error uploading to ImgBB, falling back to local storage...', error);
    }
  }

  // 2. Local storage fallback
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const localPath = path.join(uploadDir, uniqueName);
  fs.writeFileSync(localPath, fileBuffer);
  console.log(`[Upload] Saved file locally: uploads/${uniqueName}`);
  return `uploads/${uniqueName}`;
};

/**
 * Returns a secure URL or the local file URL to view the file.
 * @param fileKey The identifier key/path/URL.
 * @returns The URL string.
 */
export const getSignedFileUrl = async (fileKey: string): Promise<string> => {
  if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
    return fileKey;
  }
  // Return mock host URL
  const host = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  return `${host}/${fileKey}`;
};

/**
 * Deletes a file from local storage, or skips if remote.
 * @param fileKey The identifier key/path/URL.
 */
export const deleteFile = async (fileKey: string): Promise<void> => {
  if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
    console.log(`[Delete File] Skipping deletion for remote URL: ${fileKey}`);
    return;
  }
  // Delete local file
  const filePath = path.join(process.cwd(), fileKey);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`[Delete File] Removed local file: ${filePath}`);
  }
};

export default uploadFile;
