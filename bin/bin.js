#!/usr/bin/env node

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
/*
program
  .option('-u')
  .option('--file <char>')
  .option('-s, --separator <char>');*/

program
  .command('upload')
  .option('--file <char>')
  .option('--rate-limit <number>')
  .option('-p, --progress').action(async(args, options) => {
    //console.log("STR=", args)
    const Upload = new CUpload;
    Upload.setProgress(args.progress);
    Upload.on('finish', (link) => {
      console.log("Link:", link)
    });
    if ('rateLimit' in args && Number(args.rateLimit) > 0) {
      Upload.setRateLimit(Number(args.rateLimit));
    }
    await Upload.init(args.file);
    await Upload.upload(true);
  });;

program.parse();