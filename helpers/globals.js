/**
 * This scripts contains some reusable helper functions
 */

//import global functions
var fileOperations = new FileOperations();
var jsonFilePath = localScriptsPath() + "/config.json";

//return location of package in TB default packages
function getPackageLoc() {
  return (
    specialFolders.plugins + "/ScriptingInterfaces/resources/packages/TBH-Kitsu"
  );
}

//return the assets directory
function getAssetsDir() {
  var assetDir = getPackageLoc() + "/assets/";
  return assetDir;
}

//return full api endpoint
function getApiEndpoint(path) {
  var packageConfigFile = fileOperations.read(jsonFilePath);
  var packageConfig = JSON.parse(packageConfigFile);
  var endpoint = packageConfig.kitsu_address;
  return endpoint + path;
}

//sleep function
function sleepFor(sleepDuration) {
  var now = new Date().getTime();
  while (new Date().getTime() < now + sleepDuration) {}
}

/**
 * Alert Class
 * Handles all logs and gui dialog messages
 * @constructor
 * @param {string} [message]
 */

function Alert() {
  this.prefix = "TBH-Kitsu: ";
}

Alert.prototype.log = function (message) {
  MessageLog.trace(this.prefix + message);
};

Alert.prototype.info = function (message) {
  MessageBox.information(message);
};

Alert.prototype.warning = function (message) {
  MessageBox.warning(message);
};

/**
 * File operations class
 * handles erad, write and checking the esistence of a file
 */

function FileOperations() {
  this.alert = new Alert();
}

FileOperations.prototype.read = function (filepath) {
  var file = new File(filepath);
  try {
    if (file.exists) {
      file.open(FileAccess.ReadOnly);
      var content = file.read();
      file.close();
      return content;
    } else {
      return;
    }
  } catch (err) {
    this.alert.log("File read error :" + err);
    return null;
  }
};

FileOperations.prototype.write = function (filepath, content, append) {
  if (typeof append === "undefined") var append = false;
  this.alert.log("writing file " + filepath);
  var file = new File(filepath);

  try {
    if (append) {
      file.open(FileAccess.Append);
    } else {
      file.open(FileAccess.WriteOnly);
    }
    file.write(content);
    file.close();
    return true;
  } catch (err) {
    this.alert.log("File write error :" + err);
    return false;
  }
};

FileOperations.prototype.exists = function (filepath) {
  try {
    var file = new File(filepath);
    return file.exists;
  } catch (err) {
    this.alert.log(err);
  }
};

//Return the local scripts path of user
function localScriptsPath() {
  var path = specialFolders.temp + "/TBH-Kitsu";
  var pathDir = new QDir(path);
  if (!pathDir.exists()) {
    new QDir().mkdir(path);
  }
  return path;
}

exports.getAssetsDir = getAssetsDir;
exports.getApiEndpoint = getApiEndpoint;
exports.sleepFor = sleepFor;
exports.Alert = Alert;
exports.FileOperations = FileOperations;
exports.localScriptsPath = localScriptsPath;
exports.getPackageLoc = getPackageLoc;
