import CFile from './file.js';
import CApi from './api.js';
import CryptoLib from './crypto/index.js';
import CSha256 from './sha256.js';
import {
  basename,
  formatSize,
  getSliceOffset,
  sleep
} from './utils.js';
import ora from 'ora';
import {
  EventEmitter
} from 'node:events';

export default class CUpload extends EventEmitter {
  constructor() {
    super();
    this._progressFnSet = false;
    this._progressFn = () => {};
    this._progress = false;
    this._crcMap = {};
    this._upload_completed = false;
    this._fileid = null;
    this._uploaded = 0;
  }

  async init(path, filename = false) {
    this._path = path;
    this._handle = new CFile;
    this._handle.open(path);
    this._crypto = CryptoLib.crypto;
    this._keygen = CryptoLib.keygen;
    this._api = new CApi;
    this._key = this._keygen();
    this._iv = this._keygen();
    this._filenameRaw = (!filename) ? basename(path) : filename;
    this._filename = await this._makeFileName(path, filename);
    this._filesize = Number(this._handle.size());
    this._filesizeFormatted = formatSize(this._filesize);
    this._nksh = await this._crypto.nameKeySizeHash(this._filenameRaw, this._filesize, this._key);

    this._progressMap = {};
    this._hash = await this._makeHash();
    this._upload_id = await this._genUploadId();
    this._slices = getSliceOffset(this._filesize);
    this._servers = await this._getUploadServers();


    this._AbortController = new AbortController();
    this._AbortController.onabort = () => {
      // cleanups here
      this.__destruct();
    };
    this._signal = this._AbortController.signal;
    this._paused = false;
  }

  _getSignal() {
    return this._signal;
  }

  getAbortController() {
    return this._AbortController;
  }

  isAborted() {
    return this._signal.aborted;
  }

  pause() {
    this._paused = true;
  }

  isPaused() {
    return this._paused === true;
  }

  resume() {
    if (this._paused) {
      this._paused = false;
      this.upload()
        // todo resume upload
    }
  }


  setProgress(state) {
    this._progress = state;
    this._isProgressSet = true;
  }

  setRateLimit(kbps) {
    this._ratelimit = kbps;
  }

  setProgressFn(fn) {
    this._isProgressFnSet = true;
    this._progressFn = fn;
    this._progressFnSet = true;
  }

  __destruct() {
    this._handle.close();
  }

  _progressBar(ident, done, total, text = 'Progress') {
    /*if (!this._progress) {
      return;
    }*/
    if (this._progressFnSet) {
      return this._progressFn(...arguments);
    }
    const perc = Math.min(100, Number((done / total) * 100).toFixed(2));
    const left = 100 - perc;
    if (!(ident in this._progressMap)) {
      this._progressMap[ident] = ora('.').start();
    }
    //spinner.text = 'Loading rainbows (' + i + ' %)';
    this._progressMap[ident].text = text + ' ' + perc + '%';
    if (perc == 100) {
      this._progressMap[ident].succeed(text + ' 100%');
      this._progressMap[ident].isSilent = true;
    }
  }

  _pickServer() {
    return this._servers.sort(() => {
      return Math.random() * .5
    })[0];
  }

  async _getUploadServers() {
    const ServerResponse = await this._api.Call('storage/server.json');
    return ServerResponse.checkin;
  }

  async _makeHash(path) {
    return new Promise(async(resolve) => {
      const Sha256Instance = new CSha256;
      const hash = await Sha256Instance.packFile(this._path, (percent) => {
        if (this._progress) {
          this._progressBar('hash', percent, 100, 'Calculating Hash');
        }
      });
      resolve(hash);
    })
  }

  async _makeFileName() {
    const encrypted = await this._crypto.encrypt(Buffer.from(this._filenameRaw), this._key, this._iv);
    return CryptoLib.base64.encode(encrypted);
  }

  async _genUploadId() {
    const Request = {
      'name': this._filename,
      'size': this._filesize,
      'sha256': this._hash,
      'nksh': this._nksh
    };

    const Response = await this._api.Call('storage/bucket/create.json', Request);
    if (!Response.id) {
      throw new Error('could not create upload id');
    }
    return Response.id;
  }

  async _storeUploadRequest(server, upload_id) {
    let sorted = [];
    for (let i of Object.keys(this._crcMap).sort()) {
      sorted.push(this._crcMap[i]);
    }
    const Sha256Instance = new CSha256;
    let sha256 = Sha256Instance.pack("" + sorted.join(","));

    const Request = {
      'uploadid': upload_id,
      'server': server,
      'sha': sha256,
      'chunks': sorted.length
    };
    const Response = await this._api.Call('storage/bucket/finalize.json', Request);
    if (Response.error) {
      throw new Error(Response.error);
    }
    const id = Response.id;
    const hash = CryptoLib.base64.encode(this._crypto.mergeKeyIv(this._key, this._iv));
    this._fileid = id;
    this._hash = hash;
    this._admincode = Response.admincode;
    this._upload_completed = true;
    return true;
  }

  __progress(download_size, downloaded, upload_size, uploaded) {
    if (!this._progress) {
      return;
    }
    const bytesNow = (uploaded - this._lastSize);
    if (bytesNow > 0) {
      this._uploaded += Number(bytesNow);
      this._progressBar('progress', this._uploaded, this._filesize);
      this._lastSize = uploaded;
    }
    return 0;
  }

  async upload() {
    let len = 0;
    if (this._progress) {
      this._progressBar('progress', 0, this._filesize);
    }
    let offset;
    while (this._slices.length > 0 && (offset = this._slices.shift()) && !this.isAborted() && !this.isPaused()) {
      if (!this.isAborted()) {
        const Server = this._pickServer();
        this._lastSize = 0;
        const chunk_id = offset[0];
        const buffer = await this._handle.read(offset[1], offset[2]);
        const SizeRequired = (offset[2] - offset[1]);
        if (buffer.byteLength !== SizeRequired) {
          throw new Error('invalid filesize read...');
        }
        const encrypted = await this._crypto.encrypt(buffer, this._key, this._iv);
        len += encrypted.byteLength;
        const response = await this._api.upload(Server, this._upload_id, chunk_id, offset, encrypted, this._ratelimit, this);
        if (this.isAborted()) {
          this._slices.push(offset);
          continue;
        }
        this._crcMap[chunk_id] = response.crc32;
        if (this._progress) {
          this._progressBar('progress', len, this._filesize);
        }
      }
    }
    if (this.isPaused()) {
      return;
    }
    if (this.isAborted()) {
      this.__destruct();
      this._progressMap['progress'].fail('upload aborted');
    } else {
      if (this._progress) {
        this._progressMap['progress'].succeed('upload completed');
      }
      const Server = this._pickServer();
      await this._storeUploadRequest(Server, this._upload_id);
      this.emit('finish', this.getLink());
      this.__destruct();
    }
  }

  getLink() {
    if (this.isAborted() || this.isPaused()) {
      return false;
    }
    if (!this._upload_completed) {
      throw new Error('upload not yet finished');
    }
    return this._api.getURL() + 'f/' + this._fileid + '#' + this._hash;
  }

  getAdminCode() {
    if (this.isAborted() || this.isPaused()) {
      return false;
    }
    if (!this._upload_completed) {
      throw new Error('upload not yet finished');
    }
    return this._admincode;
  }
}