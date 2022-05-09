export const DownloadProgress = function({
  defaultSize = 0,
  emitDelay = 10,
  onProgress = () => null,
  onComplete = () => null,
  onError = () => null,
}) {
  return function FetchProgress(response) {
    const {
      body,
      headers,
      status
    } = response;
    const contentLength = headers.get('content-length') || defaultSize;
    const reader = body.getReader();
    let loaded = 0;
    const stream = new ReadableStream({
      start(controller) {
        function push() {
          reader
            .read()
            .then(({
              done,
              value
            }) => {
              if (done) {
                onComplete({});
                controller.close();
                return;
              }
              if (value) {
                onProgress((loaded + value.length), parseInt(contentLength));
                loaded += value.length;
              }
              controller.enqueue(value);
              push();
            })
            .catch((err) => {
              onError(err);
            });
        }

        push();
      },
    });
    return new Response(stream, {
      headers,
      status
    });
  };
}