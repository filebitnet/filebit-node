import {
  fetch
} from 'native-fetch'
import {
  Blob
} from 'fetch-blob';
if (!globalThis.fetch) {
  globalThis.fetch = fetch;
}
if (!globalThis.Blob) {
  globalThis.Blob = Blob;
}