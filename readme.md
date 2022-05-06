![](img/shell.gif)

## File Upload
```javascript
import {
  CUpload,
  Utils
} from 'filebit-node';

const File2Upload = 'test.txt';
const Upload = new CUpload;
Upload.setProgress(true);
Upload.on('finish', (link) => {
  console.log("Done: %o Admincode: %o\n ", link, Upload.getAdminCode())
});
//Upload.setRateLimit(131072);
await Upload.init(File2Upload);
Upload.upload(true);
```
