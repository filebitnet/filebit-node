//nodeJS keygen
import {
  randomBytes
} from 'node:crypto';



/**
 * create a random cryptographic seed
 *
 * @function keygen
 * @param {Number} [bit=128] - the bits to generate
 * @return Buffer - the generated random bytes
 */
export default (bit = 128) => {
  let len = bit / 8;
  let rb = randomBytes(len);
  return rb;
};