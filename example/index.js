const express = require("express"),
  winston = require("winston"),
  lincoln = require("lincoln"),
  app = express(),
  transports = [
    // new winston.transports.File({ filename: "error.log", level: "error" }),
    // new winston.transports.File({ filename: "combined.log" })
  ];

if (process.env.NODE_ENV !== "production") {
  console.log("adding console transport");
  transports.push(new winston.transports.Console());
}

const values = [
  "date",
  "request-id",
  "method",
  "url",
  "status",
  "response-time",
  "remote-addr",
  "user-agent",
  "http-version",
  "query",
  "request-body",
  "request-headers",
  "request-id",
  "response-body"
];

app.use(lincoln({ transports, values }));
app.get("/", (req, res) => res.send("Hello World!"));
app.listen(3000, () => console.log("Example app listening on port 3000!"));
