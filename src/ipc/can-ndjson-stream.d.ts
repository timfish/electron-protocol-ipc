declare module "can-ndjson-stream" {
  function ndjsonStream<T>(
    stream: ReadableStream<Uint8Array>
  ): ReadableStream<T>;

  export default ndjsonStream;
}
