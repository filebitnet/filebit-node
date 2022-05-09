#!/usr/bin/env node

process.removeAllListeners('warning')
import {
  program
} from 'commander';

import {
  CUpload,
  CDownload,
  Utils
} from '../index.js';
const {
  formatSize,
  getParts,
  isValidURL
} = Utils;

program
  .command('upload')
  .requiredOption('--file <char>')
  .option('--rate-limit <number>')
  .option('--tpl <string>', 'output template ex: --tpl=\'{"link":"%s"}\'')
  .option('-p, --progress').action(async(args, options) => {
    const Upload = new CUpload;
    Upload.on('finish', (link) => {
      if ('tpl' in args) {
        const tpl = String(args.tpl).replace('%s', link);
        console.log(tpl);
        return;
      }
      console.log(link)
    });
    if (args.progress) {
      Upload.setProgress(args.progress);
    }
    await Upload.init(args.file);
    if ('rateLimit' in args && Number(args.rateLimit) > 0) {
      Upload.setRateLimit(Number(args.rateLimit));
    }
    await Upload.upload(true);
  });

program
  .command('download')
  .requiredOption('--url <string>')
  .requiredOption('--path <string>')
  .option('--tpl <string>', 'output template ex: --tpl=\'{"link":"%s"}\'')
  .option('-p, --progress')
  .action(async(args, options) => {
    const URL = unescape(args.url);
    if (!isValidURL(URL)) {
      console.error('URL seems to not be a valid filebit.net url');
      return false;
    }

    const URLParts = getParts(URL);
    const path = args.path;

    const Download = new CDownload(URLParts.id, URLParts.hash);
    Download.setIsBin(true);
    Download.on('finish', (path) => {
      if ('tpl' in args) {
        const tpl = String(args.tpl).replace('%s', path);
        console.log(tpl);
        return;
      }
      console.log(path)
    });
    await Download.setStoragePath(path);
    if (args.progress) {
      Download.setProgress(args.progress);
    }
    Download.download();
  });

program.parse();