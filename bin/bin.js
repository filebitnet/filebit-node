#!/usr/bin/env node

process.removeAllListeners('warning')
import {
  program
} from 'commander';

import {
  CUpload,
  Utils
} from '../index.js';
const {
  formatSize
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

program.parse();