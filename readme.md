![](img/shell.gif)

## Check Filebit URL & Get Parts
```javascript
import {Utils} from 'filebit-node';
const URL = 'https://filebit.net/f/qknI9LX#Ac1A3HJ13aBRn66XHnkktQNlOK1dxItiRqnkAovV82uU';

console.log(Utils.isValidURL(URL)); // => true
console.log(Utils.getParts(URL));
/*
{
  id: 'qknI9LX',
  hash: 'Ac1A3HJ13aBRn66XHnkktQNlOK1dxItiRqnkAovV82uU',
  admincode: false
}
*/
```

## Get Upload Server
```javascript
import {CApi} from 'filebit-node';
const Api = new CApi();
const ServerResponse = await Api.Call('storage/server.json');
console.log(ServerResponse);
```

## File Upload
```javascript
import {
  CUpload
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

## CLI Usage
the library needs to be linked
### Upload
```bash
bash-3.2$ filebit-node upload --help
Usage: filebit-node upload [options]

Options:
  --file <string>
  --rate-limit <number>
  --tpl <string>         output template ex: --tpl='{"link":"%s"}'
  -p, --progress
  -h, --help             display help for command
```
> Example
```bash
filebit-node upload --file ./100MB.bin --tpl='{"link":"%s"}' -p
```


### Download
```bash
bash-3.2$ filebit-node download --help
Usage: filebit-node download [options]

Options:
  --url <string>
  --path <string>
  --tpl <string>   output template ex: --tpl='{"link":"%s"}'
  -p, --progress
  -h, --help       display help for command
```
> Example
```bash
filebit-node download --url='https://filebit.net/f/...#...' --path='./downloaded.bin' -p --tpl='{"path":"%s"}'
```
