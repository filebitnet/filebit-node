import {
  Readable,
  PassThrough
} from 'stream';
import FormData from 'form-data';
import {
  fetch
} from 'native-fetch';
const sleep = (msec) => {
  return new Promise(resolve => {
    setTimeout(resolve, msec)
  })
}
const _DEBUG = false;
export const upload = async({
  url,
  buffer,
  ua,
  progress = () => {},
  kbps = 0,
  signal
}) => {

  const form = new FormData();
  form.append("file", buffer, {
    filename: 'dat.bin',
    contentType: 'application/octet-stream'
  });
  const blob = new Blob([form.getBuffer()]);
  //console.log("Blob text: ", await blob.text())
  const totalBytes = blob.size;
  let bytesUploaded = 0;

  const blobReader = blob.stream().getReader();
  let lastByteWritten = 0;

  const progressTrackingStream = new ReadableStream({
    async pull(controller) {
      const result = await blobReader.read();
      if (result.done) {
        //console.log("completed stream");
        controller.close();
        return;
      }
      // apply throttling here
      if (kbps === 0) {
        controller.enqueue(result.value);
        bytesUploaded += result.value.byteLength;
        if (progress && typeof(progress) == 'function') {
          const percent = (bytesUploaded / totalBytes) * 100;
          //console.log("percent = %o", percent)
          //__progress(download_size, downloaded, upload_size, uploaded, percent)
          progress(0, 0, totalBytes, bytesUploaded, percent);
        }
      } else {
        let offset = 0;
        let chunk = result.value;

        while (offset < chunk.length) {
          if (true) {
            //console.log("chunksize is", this.getRate())
            const maxOffset = Math.min(chunk.length, offset + kbps);
            const _chunk = chunk.subarray(offset, maxOffset);
            //console.log("enqueue ", _chunk.byteLength)
            controller.enqueue(_chunk);
            bytesUploaded += _chunk.length;
            if (progress && typeof(progress) == 'function') {
              const percent = (bytesUploaded / totalBytes) * 100;
              //console.log("percent = %o", percent)
              //__progress(download_size, downloaded, upload_size, uploaded, percent)
              progress(0, 0, totalBytes, bytesUploaded, percent);
            }


            //this.push(_chunk);
            offset += _chunk.length;
            //this._bytesRead += _chunk.length;
            //console.log("sleeping 1 sek");

            let waiting = Math.floor(999 / kbps * _chunk.length);

            if (kbps > 0) {
              await sleep(waiting);
            }
          } else {
            if (_DEBUG) console.log("paused is called")
            await sleep(40);
          }
        }
      }
    },
  });
  try {
    const fetchOptions = {
      method: "POST",
      headers: {
        'Content-Type': 'multipart/form-data;boundary=' + form.getBoundary(),
        //'Content-Type': 'multipart/form-data',
        'User-Agent': ua,
        'Content-Length': form.getLengthSync()
      },
      signal,
      body: progressTrackingStream,
    };
    //console.log("URL = %o\nRequest=%o", url, fetchOptions);

    const response = await fetch(url, fetchOptions);
    //console.log(response)
    if (response && response.ok) {
      //console.log("success:", response.ok, response);
      const json = await response.json();
      return json;
    }
    return false;
  } catch (e) {
    return false;
    //console.log("Exception : ", e)
  }
}