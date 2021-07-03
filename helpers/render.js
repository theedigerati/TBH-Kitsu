/**
 * This script handles rendering of a scene into a video file or just a frame.
 * It returns the rendered file
 */

//global imports
var globalImport = require("./globals.js");
var alert = new globalImport.Alert();
var fileOperations = new globalImport.FileOperations();
var jsonFilePath = globalImport.localScriptsPath() + "/config.json";
var packageConfigFile = fileOperations.read(jsonFilePath);
var packageConfig = JSON.parse(packageConfigFile);

/**
 * The Checkin function will render the current scene from first frame as
 * img or all frames as video, depending on the isFrameRender condition
 * @param {boolean} isFrameRender
 * It returns the renderedFilePath
 */
function sceneRender(isFrameRender) {
  var tbServerHostname = packageConfig.tbServerHostname;

  //rendered file return path
  var renderedFilePath;

  //generate checkin path
  var scenePath = tbServerHostname
    ? scene.currentProjectPath().replace(/\//g, "\\")
    : scene.currentProjectPath();

  var checkinPath = tbServerHostname
    ? tbServerHostname + scenePath + "\\checkin"
    : scenePath + "/checkin";
  var remappedCheckinPath = fileMapper.toNativePath(checkinPath);
  var checkinDir = new Dir(remappedCheckinPath);

  var pathForImgRender = tbServerHostname
    ? checkinPath + "\\preview.png"
    : checkinPath + "/preview.png";
  var pathForMovRender = tbServerHostname
    ? checkinPath + "\\preview.mov"
    : checkinPath + "/preview.mov";

  //check export functionality
  if (!canCreateMovie()) {
    alert.log(
      "Could not load WebCCExporter, perhaps the OpenH264 library is not installed."
    );
  }

  if (!checkinDir.exists) {
    checkinDir.mkdir();
  } else {
    //disable write access to all nodes
    disableAllWrites();
    var defaultDisplay = scene.getDefaultDisplay();

    if (!defaultDisplay) {
      alert.warning("Default display is not available");
    } else {
      var tmpMovieImages = [];
      //progress bar for render actions( with progress bar as pb)
      var progress = new QProgressDialog();
      progress.setWindowTitle("Rendering Scene...");
      progress.setLabelText("Waiting...");
      progress.setMaximum(100);
      progress.setMinimum(0);
      progress.modal = true;
      progress.show();

      //a loop will happen here for each frame in the scene
      render.frameReady.connect(function (frame, frameCel) {
        if (isFrameRender && frame === 1) {
          frameCel.imageFile(pathForImgRender);
        }

        if (!isFrameRender && canCreateMovie()) {
          var filename = tbServerHostname
            ? checkinPath + "\\movie-" + frame + ".png"
            : checkinPath + "/movie-" + frame + ".png";
          frameCel.imageFile(filename);
          alert.log("...written: " + filename);
          tmpMovieImages.push(filename);
        }

        //increase progress
        var percentProgress = Math.ceil((frame / scene.getStopFrame()) * 100);
        progress.setLabelText("Rendering frame " + frame + "...");
        progress.value = percentProgress;
        globalImport.sleepFor(50);
      });

      render.setRenderDisplay(defaultDisplay);
      if (isFrameRender) {
        render.renderScene(1, 1);
        renderedFilePath = pathForImgRender;
      } else {
        render.renderSceneAll();
        alert.log(
          "....done rendering individual frames. Will now assemble movie"
        );
        createMovie(pathForMovRender, tmpMovieImages); // note: this also cleans up the tmpMovieImages.
        renderedFilePath = pathForMovRender;
      }
      progress.close();
      alert.log("Rendering Complete");
      return renderedFilePath;
    }
  }
}

//Helper Funcions
function canCreateMovie() {
  return (
    typeof WebCCExporter === "object" &&
    typeof WebCCExporter.exportMovieFromFiles === "function"
  );
}

function findAllWrites(writes, groupName) {
  var nodes = node.subNodes(groupName);
  for (var idx = 0; idx < nodes.length; ++idx) {
    var nodeName = nodes[idx];
    var type = node.type(nodeName);
    if (type == "WRITE") {
      writes.push(nodeName);
    } else if (type == "GROUP") {
      findAllWrites(writes, nodeName);
    }
  }
}

function disableAllWrites() {
  var writes = new Array();
  var topGroup = node.root();

  findAllWrites(writes, topGroup);
  for (var writeIdx = 0; writeIdx < writes.length; writeIdx++) {
    var write = writes[writeIdx];
    node.setEnable(write, false);
  }
}

function createMovie(movieFilename, imageFilenames) {
  if (canCreateMovie()) {
    WebCCExporter.exportMovieFromFiles(movieFilename, imageFilenames);
  } else {
    alert.warning(
      "Could not load WebCCExporter, perhaps the OpenH264 library is not installed."
    );
  }
}

exports.sceneRender = sceneRender;
