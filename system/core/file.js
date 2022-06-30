import {
  open,
  read,
  write,
  close,
  ReadStream,
  unlinkSync,
  statSync,
  existsSync
} from 'node:fs';

export default class CFile {
  async open(filepath, mode = 'r') {
    this._isOpen = true;
    this._path = filepath;
    this._mode = mode;
    this._handle = await this._open(this._path);
  }

  _open(path) {
    return new Promise(resolve => {
      open(path, this._mode, (err, fd) => {
        if (err) {
          console.log("error opening file", path, err);
          return resolve(false);
        }
        return resolve(fd);
      })
    });
  }

  read(start, stop) {
    return new Promise(resolve => {
      let bufLen = (stop - start);
      let buffer = Buffer.alloc(bufLen);

      read(this._handle, buffer, 0, bufLen, start, (err, bytesRead, buffer) => {
        if (err) {
          console.log(err);
          return resolve(false);
        }
        if (bytesRead == bufLen) {
          resolve(buffer);
        } else {
          resolve(false);
          console.log("unfinished read?!?!?!?!", bytesRead, buffer.length);
        }
      })
    });
  }

  write(start, buf) {
    return new Promise(resolve => {
      //console.log("fs.write(%o, (len:%o));", start, buf.byteLength)
      //fs.write(fd, buffer[, offset[, length[, position]]], callback)#
      write(this._handle, buf, 0, (buf.byteLength), start, function(err) {
        if (err) {
          console.log(err)
        }
        resolve()
      })
    });
  }

  _close() {
    close(this._handle, (er) => {
      if (er) {
        console.log(er)
      }
    });
  };

  close() {
    this._close();
  }

  exists() {
    return existsSync(this._path);
  }

  size() {
    //filesize($this->path);
    try {
      const stat = statSync(this._path);
      return stat['size'];
    } catch (e) {
      return 0;
    }
  }

}