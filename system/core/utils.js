const mags = ' KMGTPEZY';

export const formatSize = (bytes) => {
  var thresh = 1024;
  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }
  var units = ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  var u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);
  let [a, b] = String(bytes.toFixed(1)).split('.');
  if (Number(b) == 0) {
    return a + ' ' + units[u];
  }
  return bytes.toFixed(1) + ' ' + units[u];
};

export const getRegex = () => {
  return /https?:\/\/(www\.|.*\.)?(filebit\.ch|filebit\.org|filebit\.net)\/f\/(([a-zA-Z0-9]+){6,9})((\?|&)(.+?))?#(([a-zA-Z0-9-_]+){16,25})$/;
}

export const isValidURL = (url) => {
  return getRegex().test(url);
}

export const getParts = (url) => {
  let matches = String(url).match(getRegex());
  if (matches) {
    let admincode = false;
    if (matches[7] && matches[7].indexOf('admincode') > -1) {
      let s = new URLSearchParams(match[7]);
      if (s.has('admincode')) {
        admincode = s.get('admincode');
      }
    }
    return {
      id: matches[3],
      hash: matches[8],
      admincode: admincode
    };
  }
  return false;
}

export const basename = (path) => {
  return path.split('/').reverse()[0];
}


export const getSliceOffset = (fileSize) => {
  const chunklist = [];
  let bytesDone = 0;
  const offsetA = 512000;
  const offsetB = 67108864;
  let chunk_id = 0;
  for (let i = 1; i <= 8; ++i) {
    if (bytesDone < fileSize) {
      let bytes = Math.min(i * offsetA, fileSize);
      chunklist.push([chunk_id, bytesDone, Math.min(fileSize, bytesDone + bytes)]);
      bytesDone += bytes;
      ++chunk_id;
    }
  }
  while (bytesDone < fileSize) {
    chunklist.push([chunk_id, bytesDone, Math.min(fileSize, bytesDone + offsetB)]);
    bytesDone += offsetB;
    ++chunk_id;
  }
  return chunklist;
}

export default {
  formatSize,
  getRegex,
  isValidURL,
  getParts,
  basename,
  getSliceOffset
}