import {
  createHash,
  createCipheriv,
  createDecipheriv
} from 'node:crypto';
import {
  existsSync
} from 'node:fs';
import CryptoLib from './crypto/index.js';
import CFile from './file.js';

export default class CBitFile {
  constructor(password) {
    this._type = -1;
    this._iv = CryptoLib.keygen(128);
    this._data = [];
    this._handle = new CFile;
    this.setPassword(password);
  }

  async setPathAndFilename(path, filename) {
    this._path = path;
    this._filename = String(filename).replace('.bitsync', '');
    if (existsSync(`${path}${filename}.bitsync`)) {
      await this._handle.open(`${path}${filename}.bitsync`, 'r+');
      const size = this._handle.size();
      if (size > 0) {
        const buffer = await this._handle.read(0, size);
        this._slicePackage(buffer, true);
      }
    } else {
      await this._handle.open(`${path}${filename}.bitsync`, 'w+');
    }
  }

  setPassword(password) {
    this._password = createHash('sha256');
    // we don't really care about the raw password, we just need the sha256 representation of it
    this._password.update(password);
    this._passwordDigest = this._password.digest();
  }

  setType(type) {
    this._type = type;
  }

  getType() {
    return this._type;
  }

  addLine(...args) {
    this._data.push(args);
  }

  data() {
    return this._data;
  }

  __encryptBody(plain) {
    const cipher = createCipheriv('aes-256-ctr', this._passwordDigest, this._iv);
    const ciphertext = cipher.update(Buffer.from(plain));
    return Buffer.concat([this._iv, ciphertext, cipher.final()]);
  }

  __decryptBody(encrypted) {
    const iv = encrypted.slice(0, 16);
    this._iv = iv;
    const ciphertext = encrypted.slice(16);
    //console.log("iv: ", iv, "cipher", ciphertext, "password: ", this._passwordDigest)
    const decipher = createDecipheriv('aes-256-ctr', this._passwordDigest, this._iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()])
  }

  _buildHeader(bodyLength = 0, footerLength = 0) {
    const Header = Buffer.alloc(64);
    Header.writeInt16BE(this._type, 0);

    Header.writeInt8(0x69, 2); // i
    Header.writeInt8(0x6d, 3); // m
    Header.writeInt8(0x70, 4); // p


    Header.writeInt8(0x66, 5); // f
    Header.writeInt8(0x69, 6); // i
    Header.writeInt8(0x6c, 7); // l
    Header.writeInt8(0x65, 8); // e
    Header.writeInt8(0x62, 9); // b
    Header.writeInt8(0x69, 10); // i
    Header.writeInt8(0x74, 11); // t

    // 2147483647 maximum body length
    // write the password length as check, maximum possible is 127 as value
    Header.writeInt8(this._passwordDigest.byteLength, 12);
    // write the body length
    Header.writeInt32BE(bodyLength, 13); // writeInt32BE needs 4 bit
    // write the footer length
    Header.writeInt32BE(footerLength, 17);
    return Header;
  }

  _buildFooter() {
    const Footer = Buffer.alloc(64);
    return Footer;
  }

  _buildPackage() {
    const body = JSON.stringify(this._data);
    const Body = this.__encryptBody(body);
    const Footer = this._buildFooter();
    const Header = this._buildHeader(Body.byteLength, Footer.byteLength);
    return Buffer.concat([Header, Body, Footer]);
  }

  _slicePackage(buffer, rewriteData = true) {
    const Header = buffer.slice(0, 64);
    const Version = Header.readInt16BE(0);

    if (Header.slice(2, 5).toString() != 'imp') {
      console.error('invalid bitfile loaded');
      return;
    }

    if (Header.slice(5, 12).toString() === 'filebit') {
      const ExpectedPasswordLength = Header.readInt8(12);
      const ExpectedBodySize = Header.readInt32BE(13);

      const ExpectedFooterSize = Header.readInt32BE(17);

      if (this._passwordDigest.byteLength != ExpectedPasswordLength) {
        throw new Error('invalid password for decrypting this bitfile');
      }

      const BodyOffset = 64;
      const Body = buffer.slice(BodyOffset, BodyOffset + ExpectedBodySize);

      if (Body.byteLength != ExpectedBodySize) {
        throw new Error('invalid body');
      }
      //console.log("ExpectedBodySize:", ExpectedBodySize, Body.byteLength);
      const FooterOffset = BodyOffset + ExpectedBodySize;
      const Footer = buffer.slice(FooterOffset, FooterOffset + ExpectedFooterSize);

      const Decoded = this.__decryptBody(Body);
      const FirstByteString = Decoded.slice(0, 1).toString();
      //console.log("Decoded: ", Decoded, Decoded.toString())
      const DecodedString = Decoded.toString();

      if (rewriteData && ['[', '{'].indexOf(FirstByteString) > -1) {
        this._data = JSON.parse(DecodedString);
      } else {
        throw new Error('password is wrong')
      }

      return {
        Header,
        Body,
        Footer,
        DecodedString
      };
    }
  }


  async write(close = true) {
    const Data = this._buildPackage();
    await this._handle.write(0, Data);
    if (close) {
      await this._handle.close();
    }
  }


  async get() {
    const Data = this._buildPackage();
    return Data;
  }

}