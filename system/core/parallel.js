export default class CParallel {
  constructor(limit = 2) {
    this._running = 0;
    this._limit = limit;
    this._queue = [];
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
    this._isRunning = false;
    this._isStopped = false;
    this._executerFn = async() => {};
  }

  setExecuterFn(fn) {
    this._executerFn = fn;
  }

  toPromise() {
    this.run();
    return this._promise;
  }

  push(fn) {
    this._queue.push(fn);
    //this.run();
  }

  _internalRun() {
    if (this._isStopped) {
      return false;
    }

    while (this._queue.length > 0 && this._running < this._limit) {
      ++this._running;
      const args = this._queue.shift();
      this._executerFn(args).then(() => {
        this._running--;
        this._internalRun();
      });
    }
    if (this._queue.length === 0 && this._running == 0) {
      this._resolve();
    }
  }

  stop() {
    this._isStopped = true;
  }

  run() {
    if (this._isRunning) {
      return false;
    }
    this._isRunning = true;
    this._internalRun();
    return this._promise;
  }
}