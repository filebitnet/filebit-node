/*
	Credits:
	uint8_to_hex: https://blog.xaymar.com/2020/12/08/fastest-uint8array-to-hex-string-conversion-in-javascript/

*/
const LUT_HEX_4b = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
const LUT_HEX_8b = new Array(0x100);
for (let n = 0; n < 0x100; n++) {
  LUT_HEX_8b[n] = `${LUT_HEX_4b[(n >>> 4) & 0xF]}${LUT_HEX_4b[n & 0xF]}`;
}

module.exports.uint8_to_hex = (buffer, lower = false) => {
  if (is_ab(buffer)) {
    buffer = new Uint8Array(buffer);
  }
  let out = '';
  for (let idx = 0, edx = buffer.length; idx < edx; idx++) {
    out += LUT_HEX_8b[buffer[idx]];
  }
  return (lower) ? out.toLowerCase() : out;
}

module.exports.str_to_uint8 = (str) => {
  return new TextEncoder().encode(str);
}

module.exports.uint8_to_str = (buf) => {
  return new TextDecoder().decode(buf);
}

const is_ab = module.exports.is_ab = (input) => {
  return input instanceof ArrayBuffer;
}

module.exports.assert_ab = (input, msg = 'input is not an arraybuffer') => {
  if (!is_ab(input)) {
    throw new Error(msg);
  }
}

const is_str = module.exports.is_str = (input) => {
  return typeof(input) == 'string';
}

module.exports.assert_str = (input, msg = 'input is not an string') => {
  if (!is_str(input)) {
    throw new Error(msg);
  }
}

const is_uint8 = module.exports.is_uint8 = (input) => {
  return input instanceof Uint8Array;
}

module.exports.assert_uint8 = (input, msg = 'input is not an uint8array') => {
  if (!is_uint8(input)) {
    throw new Error(msg);
  }
}

const is_buf = module.exports.is_buf = (input) => {
  return input instanceof Buffer;
}

module.exports.assert_buf = (input, msg = 'input is not an node buffer') => {
  if (!is_buf(input)) {
    throw new Error(msg);
  }
}

const is_undef = module.exports.is_undef = (input) => {
  return typeof input == 'undefined';
}

module.exports.assert_undef = (input, msg = 'input is undefined') => {
  if (is_undef(input)) {
    throw new Error(msg);
  }
}