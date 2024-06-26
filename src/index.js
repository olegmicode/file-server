const express = require("express");
const path = require("path");
const fs = require("fs");
const slugify = require('slugify'); // Install slugify using npm

const app = express();
const port = 33333;

// Middleware to log agent information
app.use((req, res, next) => {
  if (req.method === "GET" && req.path.startsWith("/download")) {
    const userAgent = req.headers["user-agent"];
    const logMessage = `Time: ${new Date().toISOString()}, User Agent: ${userAgent}, Requested URL: ${
      req.originalUrl
    }\n`;

    // Append the log to a file
    fs.appendFile("downloads.log", logMessage, (err) => {
      if (err) {
        console.error("Failed to log download request:", err);
      }
    });
  }
  next();
});

app.get("/download/*", (req, res) => {
  const requestedPath = req.params[0]
    .split("/")
    .map((part) => slugify(part))
    .join(path.sep);
  const filepath = path.join(__dirname, "files", requestedPath); // Adjust the base directory as needed
  console.log('[requestedPath]', requestedPath, filepath)

  res.download(filepath, (err) => {
    if (err) {
      res.status(404).send("File not found");
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
