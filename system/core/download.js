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

export default class CDownload extends EventEmitter {
  constructor(id, key) {
    super();

    this._id = id;
    this._path = '';
    this._st = false;
    this._isDownloading = false;
    this._handle = new CFile;
    this._crypto = CryptoLib.crypto;
    this._api = new CApi;
    this._chunks = [];
    this._filesize = 0;
    this._debug = false;

    this._waitingTime = 0;
    this._slotTicket = null;
    this._downloaded = 0;
    this._lastDownloadedForSure = 0;
    this._lastSize = 0;


    if (typeof(this._isProgressSet) === undefined) {
      this._progress = false;
    }
    this._progressFnSet = false;
    this._progressFn = () => {};
    this._progressMap = {};


    this._setKeyIv(key);
  }

  setIsBin(isBin) {
    this._isBin = isBin;
  }
  IsBin() {
    return this._isBin;
  }


  setProgressFn(fn) {
    this._progressFn = fn;
    this._progressFnSet = true;
  }


  _indicateError(message, ident = 'progress', isFatal = false) {
    if (this.IsBin()) {
      if (!(ident in this._progressMap)) {
        this._progressMap[ident] = ora('.').start();
      }

      this._progressMap[ident].fail(message);
      if (isFatal) {
        this._progressMap[ident].isSilent = true
        process.exit();
      }
    } else {
      throw new Error(message);
    }
  }

  _indicateFatalError(message, ident = 'progress') {
    this._indicateError(message, ident, true);
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
    if (ident === 'wait') {
      this._progressMap[ident].text = 'Waiting ' + done + '/' + total;
    } else {
      this._progressMap[ident].text = text + ' ' + perc + '%';
    }
    if (perc == 100) {
      if (ident === 'wait') {
        this._progressMap[ident].succeed('Waiting time passed');
      } else {
        this._progressMap[ident].succeed(text + ' 100%');
      }
      this._progressMap[ident].isSilent = true;
    }


  }




  async _requestInfo() {
    const Request = {
      "file": this._id
    };
    if (this._st) {
      Request.st = this._st;
    }
    const Response = await this._api.Call('storage/bucket/info.json', Request);
    if ('error' in Response) {
      this._indicateFatalError('file not found');
      return false;
    }
    if (Response.state != 'ONLINE') {
      return this._indicateFatalError('file not found');
    }

    try {
      this._filename = await this._crypto.decrypt(CryptoLib.base64.decode(Response.filename), this._key, this._iv);
    } catch (e) {
      this._indicateFatalError('invalid encryption key');
    }

    const _nksh = await this._crypto.nameKeySizeHash(String(this._filename), Response.filesize, this._key);

    if (_nksh != Response.nksh) {
      this._indicateFatalError('invalid encryption key (nksh)');
    }
    this._filesize = Response.filesize;
    this._filsizeFormatted = formatSize(this._filesize);
    this._slot = Response.slot;
    //console.log("Response is %o", Response)
    if (!this._slot.isAvailable) {
      const error = ('error' in this._slot) ? this._slot.error : 'filebit servers full, currently no free download available';
      return this._indicateFatalError(error);
    }
    this._slotTicket = this._slot.ticket;
    this._waitingTime = parseInt(this._slot.wait);
    if ('st' in Response && this._st && Response.st.state != 'ok') {
      this._st = false;
    }
    await this._doWaitingTime();
  }

  async _validateSlot() {
    const Request = {
      'slot': this._slotTicket
    };
    const Response = await this._api.Call('file/slot.json', Request);
    if ('error' in Response) {
      return this._indicateFatalError(Response.error);
    }

    if (!Response.success) {
      return this._indicateError('slot was not properly confirmed', 'wait');
    }
  }

  async _doWaitingTime() {
    //console.log("_doWaitingTime =%o", this._waitingTime)
    if (this._waitingTime <= 0) {
      await this._validateSlot();
      return;
    }
    const max = this._waitingTime;
    if (this._debug) {
      console.log('Waitingtime (%o) Seconds', max);
    }
    do {
      if (this._progress) {
        this._progressBar('wait', (max - this._waitingTime), max);
      }
      --this._waitingTime;
      await sleep(1000);
    } while (this._waitingTime > 0);
    if (this._progress) {
      this._progressBar('wait', max, max);
    }
    this._progressBar('progress', 0, this._filesize);
    await sleep(100);
    await this._validateSlot();
  }

  async _getChunkInfos() {
    const Response = await this._api.Call('storage/bucket/contents.json', {
      id: this._id
    });
    if ('error' in Response) {
      return this._indicateFatalError(Response.error);
    }
    this._chunks = Response.chunks;
  }

  __progress(download_size, downloaded, upload_size, uploaded) {
    if (!this._progress) {
      return;
    }
    const bytesNow = (downloaded - this._lastSize);
    if (bytesNow > 0) {
      this._downloaded += Number(bytesNow);
      this._progressBar('progress', this._downloaded, this._filesize);
      this._lastSize = downloaded;
    }
    return 0;
  }

  async _internalDownloadChunk(chunkID, offset0, length, downloadId) {
    let buf = await this._api.download(downloadId, this._slotTicket, this);
    //console.log("Buf = %o", buf);
    if (Buffer.from('Forbidden').equals(buf)) {
      return false;
    }
    if ((buf[0] === '{' || buf[0] == 0x7b) && (buf[buf.length - 1] === '}' || buf[buf.length - 1] === 0x7d)) {
      const json = JSON.parse(buf.toString());
      if ('error' in json) {
        console.log('Error: %o', json.error);
      }
      return false;
    }
    const decrypted = await this._crypto.decrypt(buf, this._key, this._iv);
    //console.log("decrypted.length = %o, length = %o", decrypted.length, length)
    if (decrypted.length != length) {
      return this._indicateFatalError('Invalid buflength received');
    }
    await this.writeChunk2File(offset0, decrypted);
    //this._handle.write(offset0, decrypted);
    buf = null;
    return true;
  }

  async _doDownloadFile() {
    this._progressBar('progress', 0, this._filesize);
    for (const chunkinfo of this._chunks) {
      this._lastSize = 0;

      const chunkID = chunkinfo[0];
      const offset0 = chunkinfo[1];
      const length = chunkinfo[3];
      const downloadId = chunkinfo[5];
      let _try = 0;
      let success = false;
      do {
        success = await this._internalDownloadChunk(chunkID, offset0, length, downloadId);
        if (success) {
          this._lastDownloadedForSure = this._downloaded;
        } else {
          this._downloaded = this._lastDownloadedForSure;
          if (this._debug) {
            this._indicateError('chunk ' + chunkID + ' failed to download, will retry in ' + (_try * 5) + ' seconds');
            //console.log('chunk %o failed to download, will retry in %o seconds', chunkID, (_try * 5));
          }
          await sleep(_try * 1000 * 5);
        }
        ++_try;
        if (_try >= 5) {
          this._indicateFatalError('max amount of retrys (5) reached, aborting download...', undefined, true);
        }
      } while (!success);
    }

    this._handle.close();
    if (this._progress) {
      this._progressBar('progress', this._filesize, this._filesize);
    }
    if (this._debug) {
      console.log('the file was downloaded successfully...');
    }
    this.emit('finish', this._path);
  }
  _setKeyIv(key) {
    const temp = this._crypto.unmergeKeyIv(CryptoLib.base64.decode(key));
    this._key = temp['key'];
    this._iv = temp['iv'];
  }

  async writeChunk2File(offset, chunk) {
    if (!this._handle._isOpen) {
      return this._indicateFatalError('could not write chunk, file is not yet open please call, setStoragePath(path) first.');
    }
    await this._handle.write(offset, chunk);
  }

  setSpeedTicket(st) {
    this._st = st;
  }
  async setStoragePath(path) {
    this._path = path;
    await this._handle.open(path, 'w+');
  }
  setProgress(state) {
    this._progress = state;
  }
  setDebug(state) {
    this._debug = state;
  }
  async download() {
    if (this._isDownloading) {
      return this._indicateFatalError('download already running')
    }
    this._isDownloading = true;
    await this._requestInfo();

    await this._getChunkInfos();
    await this._doDownloadFile();
  }
}