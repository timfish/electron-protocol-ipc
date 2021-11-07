declare module 'can-ndjson-stream' {
  function ndjsonStream<T>(
    stream: ReadableStream<Uint8Array> | null
  ): ReadableStream<T>;

  export default ndjsonStream;
}
