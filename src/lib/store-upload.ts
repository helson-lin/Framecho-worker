/** Overwrite one share's media. A new key is removed again if D1 rejects the update. */
export async function replaceStoredObject(
  bucket: R2Bucket,
  previousKey: string,
  key: string,
  body: ReadableStream | string,
  options: R2PutOptions,
  persist: (object: R2Object) => Promise<unknown>,
): Promise<R2Object> {
  const sameKey = previousKey === key
  // Separate calls so the onlyIf overload stays nullable. One conditional
  // options object makes put()'s return type non-null and the check below
  // looks redundant to the type checker.
  const object = sameKey
    ? await bucket.put(key, body, options)
    : await bucket.put(key, body, {
        ...options,
        onlyIf: new Headers({ "If-None-Match": "*" }),
      })
  if (!object) throw new Error("Upload identifier collision; retry the upload")
  try {
    await persist(object)
  } catch (error) {
    if (!sameKey) await deleteQuietly(bucket, key, "uncommitted replacement")
    throw error
  }
  if (!sameKey) await deleteQuietly(bucket, previousKey, "replaced upload")
  return object
}

async function deleteQuietly(bucket: R2Bucket, key: string, reason: string) {
  try {
    await bucket.delete(key)
  } catch (cleanupError) {
    console.error(
      JSON.stringify({
        message: "Failed to clean up " + reason,
        key,
        error:
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError),
      }),
    )
  }
}

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
