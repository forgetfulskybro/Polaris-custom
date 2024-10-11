module.exports = class KeepAlive {
  constructor(client) {
    this.client = client;
  }

  /**
   * Start the keep alive system (listener to the process)
   */
  start() {
    this.client.on("rateLimited", (log) => {
      const { route: path, limit, timeToReset: timeout } = log;
      console.error(
        `Rate limited on ${path} with a limit of ${limit} and a timeout of ${timeout}`,
      );
    });

    this.client.on("error", (err) => {
      console.error(err);
    });

    this.client.on("warn", async (info) => {
      console.warn(info);
    });

    process.on("unhandledRejection", async (reason) => {
      console.error(reason);
    });

    process.on("uncaughtException", async (err) => {
      console.error(err);
    });
    process.on("uncaughtExceptionMonitor", async (err) => {
      console.error(err);
    });
    process.on("UnhandledPromiseRejection", (err) => {
      console.error(err);
    });
  }
};
