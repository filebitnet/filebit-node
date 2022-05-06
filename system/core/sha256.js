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
  packFile(filepath, progress = () => {}, algorithm = 'sha256') {
    return new Promise((resolve, reject) => {
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
          calculatedAlready += data.length;
          shasum.update(data);
          doProgress();
        });
        // making digest
        s.on('end', function() {
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