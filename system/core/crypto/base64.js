/** @package */
/** @module base64 */
const encode_url = (str) => {
  return String(str)
    .replace(/\+/gi, '-')
    .replace(/\//gi, '_')
    .replace(/=/gi, '');
};
/**
 * encodes a Buffer into an base64 encoded string
 *
 * @function encode
 * @param {Buffer} buf - buffer to be encoded
 * @return String - the base64 representation of the buffer
 **/
export const encode = (buf) => {
  return encode_url(buf.toString('base64'));
};

const decode_url = (str) => {
  return String(str)
    .replace(/\-/gi, '+')
    .replace(/_/gi, '/');
};
/**
 * decodes a base64 String into a Buffer
 *
 * @function decode
 * @param {String} str - base64 String to be decoded
 * @return Buffer - the decoded result as a Buffer
 **/
export const decode = (str) => {
  return Buffer.from(decode_url(str), 'base64');
};

export default {
  encode,
  decode
}