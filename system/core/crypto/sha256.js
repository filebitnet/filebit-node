/** @memberof CryptoLib */
import {
  createHash
} from 'node:crypto';
import utils from './utils.js';

/**
 * create a sha56 Buffer from a Buffer
 *
 * @async
 * @function sha256
 * @param {buffer} Buffer - the data to be hashed as Buffer
 * @return {Promise<Buffer>} the hashed data as Buffer
 */
export default (buffer) => {
  return new Promise(resolve => {
    utils.assert_buf(buffer, 'input for sha256 needs to be buffer')
    return resolve(createHash('sha256').update(buffer).digest());
  });
}