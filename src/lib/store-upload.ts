/** Compensate an R2 write if the D1 insert fails. Never overwrite an existing key. */
export async function storeUpload(
  bucket: R2Bucket,
  key: string,
  body: ReadableStream | string,
  options: R2PutOptions,
  persist: (object: R2Object) => Promise<unknown>,
): Promise<R2Object> {
  const object = await bucket.put(key, body, {
    ...options,
    onlyIf: new Headers({ "If-None-Match": "*" }),
  });
  if (!object) throw new Error("Upload identifier collision; retry the upload");
  try {
    await persist(object);
  } catch (error) {
    try {
      await bucket.delete(key);
    } catch (cleanupError) {
      console.error(
        JSON.stringify({
          message: "Failed to clean up unregistered upload",
          key,
          error:
            cleanupError instanceof Error
              ? cleanupError.message
              : String(cleanupError),
        }),
      );
    }
    throw error;
  }
  return object;
}
