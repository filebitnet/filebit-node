import {
  fetch
} from 'native-fetch'
if (!globalThis.fetch) {
  globalThis.fetch = fetch;
}