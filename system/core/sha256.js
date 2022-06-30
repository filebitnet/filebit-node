import {
  createHash
} from 'crypto';
import {
  statSync,
  ReadStream
} from 'node:fs';

export default class CSha256 {
  pack(data) {
    return createHash('sha256').update(String(data)).digest('hex');
  }
  packFile(filepath, progress = () => {}, algorithm = 'sha256', AbortSignal = null) {
    return new Promise((resolve, reject) => {
      let isAborted = false;
      const stat = statSync(filepath);
      if (!stat) {
        return reject("invalid path");
      }
      const size = stat['size'];
      let calculatedAlready = 0;
      let shasum = createHash(algorithm);
      const doProgress = () => {
        const percent = calculatedAlready / size * 100;
        progress(percent);
      };

      try {
        let s = ReadStream(filepath)
        s.on('data', function(data) {
          if (AbortSignal !== null && AbortSignal.aborted) {
            s.destroy();
            isAborted = true;
            return resolve(-1);
          }
          calculatedAlready += data.length;
          shasum.update(data);
          doProgress();
        });
        // making digest
        s.on('end', function() {
          if (isAborted) {
            return false;
          }
          const hash = shasum.digest('hex')
            //doProgress();
          return resolve(hash);
        });
        s.on('destroy', () => {
          s = null;
        });
      } catch (error) {
        console.log("error", error)
        return reject('calc fail');
      }
    });
  }
}