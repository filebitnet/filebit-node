import {
  upload
} from './api_upload.js';
import {
  DownloadProgress
} from './api_download.js';

export default class CApi {
  constructor() {
    this._endpoint = 'https://filebit.net/';
    this._fqdn = 'https://filebit.net/';
    this._ssl = true;
    this._ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3831.6 Safari/537.36';
    this._y_bid = '9d1fe3c182ca598f440d06787b9d479e3eaa6d2d';
  }

  setYBid(y_bid) {
    this._y_bid = y_bid;
  }

  _appendYBid(url) {
    if (url.indexOf('?') > -1) {
      url += '&y_bid=' + this._y_bid;
    } else {
      url += '?y_bid=' + this._y_bid;
    }
    return url;
  }

  getURL() {
    return this._fqdn;
  }

  async _get(url) {
    url = this._appendYBid(url);
    const response = await fetch(url, {
      method: 'get',
      headers: {
        'User-Agent': this._ua
      }
    });
    const data = await response.json();
    return data;
  }

  async _post(url, params) {
    url = this._appendYBid(url);
    const response = await fetch(url, {
      method: 'post',
      body: JSON.stringify(params),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this._ua
      }
    });
    const data = await response.json();
    return data;
  }

  async download(downloadId, slotId, parent) {
    let url = this._endpoint + 'download/' + downloadId + '?slot=' + slotId;
    url = this._appendYBid(url);
    const response = await fetch(url, {
      method: 'get',
      headers: {
        'User-Agent': this._ua
      }
    }).then(DownloadProgress({
      onProgress: (loaded, size) => {
        try {
          parent.__progress.bind(parent)(size, loaded, 0, 0);
        } catch (e) {}
      }
    }));
    const data = await response.arrayBuffer();
    return Buffer.from(data);
  }

  async upload(server, upload_id, chunk_id, offset, buffer, kbps = 0, parent) {
    const url = ((this._ssl) ? 'https' : 'http') + '://' + server + '/storage/bucket/' + upload_id + '/add/' + chunk_id + '/' + offset[1] + '-' + offset[2];

    //console.log("Uploading to: ", url);
    const json = await upload({
      url,
      buffer,
      ua: this._ua,
      kbps,
      progress: parent.__progress.bind(parent),
      signal: parent._getSignal()
    });
    return json;
  }

  async Call(endpoint, postData = {}) {
    const url = this._endpoint + endpoint;
    if (Object.keys(postData).length > 0) {
      return await this._post(url, postData);
    }
    return await this._get(url);
  }
}