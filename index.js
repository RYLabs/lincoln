const winston = require("winston"),
  morgan = require("morgan"),
  uuid = require("uuid/v4"),
  logfmt = require("logfmt"),
  REQUEST_ID_HEADER = "X-Request-Id",
  DEFAULT_COLLECTOR_VALUES = [
    "date",
    "request-id",
    "method",
    "url",
    "status",
    "response-time",
    "remote-addr",
    "user-agent"
  ];

function token(name, fn) {
  morgan.token(name, fn);
  return this;
}

token("http-version", (req, res) => req.httpVersion);
token("query", (req, res) => JSON.stringify(req.query));
token("request-body", (req, res) => req.body);
token("request-headers", (req, res) => JSON.stringify(req.headers));
token("request-id", (req, res) => req[REQUEST_ID_HEADER]);
token("response-body", (req, res) => res._body);

function createCollector(options) {
  options = options || {};
  let { values } = options;
  values = values || DEFAULT_COLLECTOR_VALUES;
  return function formatter(tokens, req, res) {
    const payload = {};
    for (let v of values) {
      payload[v] = tokens[v](req, res);
    }
    return logfmt.stringify(payload);
  };
}

function createLoggerStream(options) {
  options = options || {};
  let { transports } = options;
  transports = transports || [];
  const logger = winston.createLogger({
    level: "info",
    format: winston.format.printf(info => info.message.trim()),
    transports
  });
  return { write: logger.info.bind(logger) };
}

function captureBody(res) {
  const originalEnd = res.end,
    originalWrite = res.write,
    chunks = [];
  let capturing = false,
    firstCapture = true;

  function capture(rawChunk, encoding) {
    if (firstCapture) {
      firstCapture = false;
      capturing = true;
    }

    if (capturing && rawChunk) {
      let chunk = rawChunk;
      if (
        rawChunk !== null &&
        !Buffer.isBuffer(chunk) &&
        encoding !== "buffer"
      ) {
        if (!encoding) {
          chunk = new Buffer(rawChunk);
        } else {
          chunk = new Buffer(rawChunk, encoding);
        }
      }
      chunks.push(chunk);
    }
  }

  res.write = function(chunk, encoding) {
    capture(chunk, encoding);
    originalWrite.apply(res, arguments);
  };

  res.end = function(chunk, encoding) {
    capture(chunk, encoding);
    capturing = false;
    res._body = Buffer.concat(chunks).toString("utf-8");
    originalEnd.apply(res, arguments);
  };
}

function lincoln(options) {
  const stream = createLoggerStream(options),
    formatter = createCollector(options),
    _morgan = morgan(formatter, { stream });

  return function(req, res, next) {
    req[REQUEST_ID_HEADER] = req.header(REQUEST_ID_HEADER) || uuid();
    res.setHeader(REQUEST_ID_HEADER, req[REQUEST_ID_HEADER]);
    captureBody(res);
    _morgan(req, res, next);
  };
}

module.exports = lincoln;
module.exports.token = token;
