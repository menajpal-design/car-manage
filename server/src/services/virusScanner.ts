/**
 * Simulated Virus Scanner Service.
 * Inspects file buffer for known malware signatures (e.g., EICAR test string).
 */
export interface IScanResult {
  isClean: boolean;
  threatDetails?: string;
}

export const scanFile = async (
  fileBuffer: Buffer,
  fileName: string
): Promise<IScanResult> => {
  console.log(`[Virus Scanner] Initializing threat inspection for file: ${fileName} (${fileBuffer.length} bytes)...`);

  // Simulated scanning delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Convert buffer to string to check for the standard EICAR test file signature
  const fileContent = fileBuffer.toString('utf-8');
  const eicarSignature = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

  if (fileContent.includes(eicarSignature)) {
    console.warn(`[Virus Scanner] WARNING: Malware signature [EICAR Test Signature] detected in file ${fileName}!`);
    return {
      isClean: false,
      threatDetails: 'Malware signature detected (EICAR-Standard-Test-File)',
    };
  }

  // Check for malicious file structure heuristics (e.g. double extension injection check)
  const hasDoubleExtension = /\.[a-zA-Z0-9]+\.[a-zA-Z0-9]+$/.test(fileName);
  if (hasDoubleExtension && fileName.toLowerCase().endsWith('.exe')) {
    console.warn(`[Virus Scanner] WARNING: Malicious double-extension execution attempt in ${fileName}!`);
    return {
      isClean: false,
      threatDetails: 'Suspicious double extension executable block',
    };
  }

  console.log(`[Virus Scanner] File ${fileName} successfully scanned. Status: CLEAN`);
  return {
    isClean: true,
  };
};

export default scanFile;
