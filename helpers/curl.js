/**
 * Using CURL to make post and get request
 */

//import global functions
var globalImport = require("./globals.js");
var alert = new globalImport.Alert();
var fileOperations = new globalImport.FileOperations();
var jsonFilePath = globalImport.localScriptsPath() + "/config.json";

// CURL Class --------------------------------------------------------
/**
 * Curl class to launch curl queries
 * @classdesc
 * @constructor
 * @param {string[]} command
 */

function CURL() {
  this.waitTime = 5000;

  try {
    var packageConfigFile = fileOperations.read(jsonFilePath);
    this.packageConfig = JSON.parse(packageConfigFile);
    this.access_token = this.packageConfig.access_token;
    this.refresh_token = this.packageConfig.refresh_token;
  } catch (err) {
    alert.log(err);
  }
}

/**
 * Post request of json data to an api endoint
 * @param {string}  url -- url of api endpoint.
 * @param {string}  data -- json data for api request.
 * @param {string}  file -- location of the file(this param is optional).
 */
CURL.prototype.post = function (url, data, addAuth, file) {
  try {
    var p = new QProcess();
    var bin = this.bin;
    var command = ["-X", "POST", url];

    if (file) {
      command.push("-F");
      command.push("file=@" + file);
    }

    if (addAuth) {
      command.push("-H");
      command.push("Authorization: Bearer " + this.access_token);
    }

    if (data) {
      command.push("-H");
      command.push("Content-Type: application/json");
      command.push("-d");
      command.push(data);
    }

    // alert.log("starting process :" + bin + " " + command.join(" "));

    p.start(bin, command);

    p.waitForFinished();

    var readOut = p.readAllStandardOutput();
    // alert.log(readOut)
    var output = new QTextStream(readOut).readAll();
    var result = JSON.parse(output);

    return result;
  } catch (err) {
    alert.log("Error with curl command: \n" + command.join(" ") + "\n" + err);
    return;
  }
};

/**
 * Get request
 * @param {string} url -- url of api endpoint.
 */
CURL.prototype.get = function (url, addAuth) {
  try {
    var p = new QProcess();
    var bin = this.bin;
    var command = [url];

    // alert.log("starting process :" + bin + " " + url.join(" "));

    if (addAuth) {
      command.push("-H");
      command.push("Authorization: Bearer " + this.access_token);
    }

    p.start(bin, command);

    p.waitForFinished();

    var readOut = p.readAllStandardOutput();
    // alert.log(readOut)
    var output = new QTextStream(readOut).readAll();
    var result = JSON.parse(output);

    return result;
  } catch (err) {
    // alert.log("Error with curl command: \n"+url.join(" ")+"\n"+err);
    return null;
  }
};

/**
 * For Downloads
 */
CURL.prototype.download = function (url) {
  try {
    var p = new QProcess();
    var bin = this.bin;
    if (typeof url == "string") url = [url];

    //alert.log("starting process :" + bin + " " + url.join(" "));
    p.start(bin, url);
  } catch (err) {
    alert.log("Error with curl command: \n" + url.join(" ") + "\n" + err);
    return null;
  }
};

/**
 * For authentication refresh
 */

CURL.prototype.refreshToken = function () {
  try {
    var p = new QProcess();
    var bin = this.bin;
    var url = globalImport.getApiEndpoint("/api/auth/refresh-token");
    var command = [url, "-H", "Authorization: Bearer " + this.refresh_token];

    alert.log("starting process auth token refresh");
    p.start(bin, command);
    p.waitForFinished();

    var readOut = p.readAllStandardOutput();
    var output = new QTextStream(readOut).readAll();
    var result = JSON.parse(output);

    var jsonPackageConfig;
    if (result.msg || result.error) {
      this.packageConfig.access_token = "";
      this.packageConfig.refresh_token = "";
      jsonPackageConfig = JSON.stringify(this.packageConfig, null, " ");
      fileOperations.write(jsonFilePath, jsonPackageConfig);
      alert.warning(
        "Sorry, your session has expired! Please reload this package."
      );
      return false;
    } else {
      this.packageConfig.access_token = result.access_token;
      jsonPackageConfig = JSON.stringify(this.packageConfig, null, " ");
      fileOperations.write(jsonFilePath, jsonPackageConfig);
      return true;
    }
  } catch (err) {
    alert.log("Error with curl command: \n" + url.join(" ") + "\n" + err);
  }
};

/**
 * find the curl executable
 */
Object.defineProperty(CURL.prototype, "bin", {
  get: function () {
    // alert.log("getting curl bin")

    if (typeof CURL.__proto__.bin === "undefined") {
      if (about.isWindowsArch()) {
        var curl = [
          System.getenv("windir") + "/system32/curl.exe",
          System.getenv("ProgramFiles") + "/Git/mingw64/bin/curl.exe",
          specialFolders.bin + "/bin_3rdParty/curl.exe",
        ];
      } else {
        var curl = [
          "/usr/bin/curl",
          "/usr/local/bin/curl",
          specialFolders.bin + "/bin_3rdParty/curl",
        ];
      }

      for (var i in curl) {
        if (new File(curl[i]).exists) {
          CURL.__proto__.bin = curl[i];
          return curl[i];
        }
      }

      throw new Error("cURL wasn't found. Install cURL first.");
    } else {
      return CURL.__proto__.bin;
    }
  },
});

exports.CURL = CURL;
