export default class CProgress {
  constructor(size, oThis) {
    this._size = size;
    this._chunkProgress = {};
    this._parent = oThis;
  }

  progress(chunk_id) {
    let _lastSize = 0;
    this._chunkProgress[chunk_id] = 0;
    return (upload_size, uploaded) => {
      //console.log("chunk=%o, upload_size=%o, uploaded=%o", chunk_id, upload_size, uploaded)
      const bytesNow = (uploaded - _lastSize);
      if (bytesNow > 0) {
        this._chunkProgress[chunk_id] += Number(bytesNow);
        //this._uploaded += Number(bytesNow);
        //this._progressBar('progress', this._uploaded, this._filesize);
        this._progress();
        _lastSize = uploaded;
      }
      return 0;
    }
  }

  reset(chunk_id) {
    this._chunkProgress[chunk_id] = 0;
    this._progress();
  }

  _progress() {
    let uploaded = 0;
    for (const chunk_id of Object.keys(this._chunkProgress)) {
      uploaded += this._chunkProgress[chunk_id];
    }
    this._parent._progressBar('progress', uploaded, this._size);
  }
}