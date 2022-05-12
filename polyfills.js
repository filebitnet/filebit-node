import {
  fetch
} from 'native-fetch'
import {
  Blob
} from 'fetch-blob';
import nb from 'node:buffer';

if (!globalThis.fetch) {
  globalThis.fetch = fetch;
}

if (nb && 'Blob' in nb) {
  globalThis.Blob = nb.Blob;
}
if (!globalThis.Blob) {
  globalThis.Blob = Blob;
}