// Wrapper for the mint-upload-url Butterbase function.
// Browser → function → service-key-authenticated storage upload URL.

const apiUrl =
  process.env.NEXT_PUBLIC_BUTTERBASE_API_URL ?? process.env.BUTTERBASE_API_URL;

if (!apiUrl) {
  throw new Error("NEXT_PUBLIC_BUTTERBASE_API_URL is not set");
}

const fnUrl = `${apiUrl}/fn/mint-upload-url`;

export type UploadResult = {
  objectId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export async function uploadFile(file: File): Promise<UploadResult> {
  // 1. Mint a presigned upload URL via the Butterbase function.
  const mintRes = await fetch(fnUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    }),
  });
  if (!mintRes.ok) {
    const detail = await mintRes.text();
    throw new Error(`Failed to mint upload URL (${mintRes.status}): ${detail}`);
  }
  const { uploadUrl, objectId } = (await mintRes.json()) as {
    uploadUrl: string;
    objectId: string;
  };

  // 2. PUT the file directly to object storage with the presigned URL.
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`File upload failed (${putRes.status})`);
  }

  return {
    objectId,
    filename: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  };
}
