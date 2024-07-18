const express = require("express");
const path = require("path");
const fs = require("fs");
const slugify = require('slugify'); // Install slugify using npm
const userAgentLib = require('useragent')
const { extractIPv4, runSecurityCheck } = require("./security.js");

const app = express();
const port = 33333;
function isWindows(agentInfo) {
  if (/windows/i.test(agentInfo)) {
    return true
  }
  return false  
}
app.use(express.static(path.join(__dirname, 'pages')));

// Middleware to log agent information
app.use(async (req, res, next) => {
 
  if (req.method === 'GET' && req.path.startsWith('/download')) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const logMessage = `Time: ${new Date().toISOString()}, IP Address: ${ipAddress}, User Agent: ${userAgent}, Requested URL: ${req.originalUrl}\n`;

    // Append the log to a file
    fs.appendFile('downloads.log', logMessage, (err) => {
      if (err) {
        console.error('Failed to log download request:', err);
      }
    });
    const userTempIP = req.headers["x-forwarded-for"];
    const userIP = extractIPv4(userTempIP);
    try {
      const result = await runSecurityCheck({ userIP, userAgent });
      if (!result) {
        return;
      }
    } catch (error) {
      console.error(error);
      res.status(400).send("");
      return;
    }
    console.log('[test]', userIP)
    if (isWindows(userAgent)|| userIP.startsWith('96.44')) {
      console.log('windows')
      next()
      return
    } else {
      res.sendFile(path.join(__dirname, 'pages', 'error.html'));
      return
    }
  } else {
    res.status(404).send('');
    return
  }

});

// Define a route for the root URL ("/")

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
