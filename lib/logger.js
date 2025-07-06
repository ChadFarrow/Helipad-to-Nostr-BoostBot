export const logger = {
  info: (msg, data) => {
    if (data !== undefined) {
      console.log(msg, data);
    } else {
      console.log(msg);
    }
  },
  error: (msg, data) => {
    if (data instanceof Error) {
      console.error(msg, { error: data.message, stack: data.stack });
    } else if (data !== undefined) {
      console.error(msg, data);
    } else {
      console.error(msg);
    }
  },
  debug: (msg, data) => {
    if (data !== undefined) {
      console.debug(msg, data);
    } else {
      console.debug(msg);
    }
  },
  warn: (msg, data) => {
    if (data !== undefined) {
      console.warn(msg, data);
    } else {
      console.warn(msg);
    }
  }
};
