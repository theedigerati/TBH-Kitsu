/**
 * Component partials
 */

//config data
var packageConfigFile = fileOperations.read(jsonFilePath);
var packageConfig = JSON.parse(packageConfigFile);

function pullTaskTypes() {
  var api = new curlImport.CURL();
  var apiUrl = globalImport.getApiEndpoint("/api/data/task-types");
  var response = api.get(apiUrl, true);
  return response;
}

function pullTaskStatus() {
  var api = new curlImport.CURL();
  var apiUrl = globalImport.getApiEndpoint("/api/data/task-status");
  var response = api.get(apiUrl, true);
  return response;
}

function getSingleObject(objects, objectId) {
  var singleObject = {};
  objects.forEach(function (object) {
    if (object.id == objectId) {
      singleObject = object;
    }
  });
  return singleObject;
}

function getPreviewFile(preview) {
  if (preview.previews && preview.previews.length > 0) {
    var fileType, fileIcon, iconType;
    var baseAddr = packageConfig.kitsu_address;
    var fileExt = preview.previews[0].extension;
    if (["png", "jpg", "jpeg", "svg"].indexOf(fileExt) >= 0) {
      fileType = "pictures";
      iconType = "image.png";
    }
    if (["mov", "mp4", "webm"].indexOf(fileExt) >= 0) {
      fileType = "movies";
      iconType = "video.png";
    }
    var fileId = preview.previews[0].id;
    var fileName = "preview-" + preview.previews[0].revision;
    var fileIcon = globalImport.getAssetsDir() + iconType;
    var fileLink =
      "<a href='" +
      baseAddr +
      "/api/" +
      fileType +
      "/originals/preview-files/" +
      fileId +
      "." +
      fileExt +
      "' style='font-size: 12px; letter-spacing: 1px; font-weight: 700; color: #00b242'> <img src='" +
      fileIcon +
      "' /> " +
      fileName +
      "</a></span>";
    var fileLabel = new QLabel(fileLink);
    return fileLabel;
  } else {
    return new QLabel("---");
  }
}

/**
 * Sort objects in descending order by the
 * "updated_at" property.
 * @param {Array} objects
 * @returns {Array}
 */
function sortObjects(objects) {
  var slicedObjects = objects.slice(0);
  slicedObjects.sort(function (a, b) {
    return b.updated_at - a.updated_at;
  });
  return slicedObjects;
}

/**
 * Change the date value of "updated_at" on every
 * object to milliseconds value.
 * @param {Array} objects
 * @returns {Array}
 */
function refactorDates(objects) {
  var newObjects = objects.map(function (object) {
    object.updated_at = getMilliSec(object.updated_at);
    return object;
  });
  return newObjects;
}

function getMilliSec(jsonDate) {
  //split json date into its components
  var date = jsonDate.split("T")[0];
  var time = jsonDate.split("T")[1];
  var dateSplit = date.split("-");
  var timeSplit = time.split(":");
  //ES5 keeps throwing "invalid date" error if the date str is added directly
  var newDate = new Date(
    dateSplit[0],
    (parseInt(dateSplit[1]) - 1).toString(),
    dateSplit[2],
    timeSplit[0],
    timeSplit[1],
    timeSplit[2]
  );
  return newDate.getTime();
}

function getFormattedDate(date, withTime) {
  var rawDate = new Date(date).toDateString();
  var rawTime = new Date(date).toTimeString();
  return withTime
    ? rawDate.slice(4) + " " + rawTime.slice(0, 5)
    : rawDate.slice(4);
}

/**
 * Check search content in task properties
 * @param {*} object
 * @param {*} searchText
 * @returns {boolean}
 */
function checkValues(object, searchText, previewTasks) {
  try {
    var isSearchMatch = false;
    searchText = searchText.toLowerCase();
    var searchObject = previewTasks
      ? getSingleObject(previewTasks, object.object_id)
      : object;
    var category = searchObject.entity_type_name.toLowerCase();
    var taskType = searchObject.task_type_name.toLowerCase();
    var episode = searchObject.episode_name
      ? searchObject.episode_name.toLowerCase()
      : "";
    var sequence = searchObject.sequence_name
      ? searchObject.sequence_name.toLowerCase()
      : "";
    var entity = searchObject.entity_name
      ? searchObject.entity_name.toLowerCase()
      : "";
    var status = searchObject.task_status_short_name.toLowerCase();
    var searchDomains = [];
    searchDomains.push(category, taskType, episode, sequence, entity, status);

    for (count = 0; count < searchDomains.length; count++) {
      var searchDomain = searchDomains[count];
      if (searchDomain.indexOf(searchText) != -1) isSearchMatch = true;
    }
    return isSearchMatch;
  } catch (err) {
    alert.log(err);
  }
}

/**
 * Add new comment and preview to a task,
 * ...its status can also be changed too.
 * @param {*} btn
 * @param {*} task
 */
function addPreview(host, btn, task, tasksStatus) {
  btn.clicked.connect(function () {
    try {
      var dialog = UiLoader.load(
        globalImport.getPackageLoc() + "/ui/add-preview.ui"
      );
      dialog.setWindowTitle("Add Preview");

      //heading
      var entity = "";
      if (task.episode_name) {
        entity += task.episode_name + " |";
      }
      if (task.sequence_name) {
        entity += task.sequence_name + " | ";
      }
      entity += task.entity_name + " - " + task.task_type_name;
      var entityHtml =
        '<span style=" font-size:12pt; font-weight:600;">' + entity + "</span>";
      dialog.label.setText(entityHtml);

      //add render options
      var addRender = false;
      dialog.radioButton.hide();
      dialog.radioButton_2.hide();
      dialog.checkBox.toggled.connect(function (checked) {
        if (checked) {
          addRender = true;
          dialog.radioButton.show();
          dialog.radioButton_2.show();
        } else {
          addRender = false;
          dialog.radioButton.hide();
          dialog.radioButton_2.hide();
        }
      });

      //task status
      var statusOptions = dialog.comboBox;
      var currentIndex = 0;
      //set the current status and display others in the select input
      for (count = 0; count < tasksStatus.length; count++) {
        var status = tasksStatus[count];
        statusOptions.addItem(status.name, status.id);
        if (task.task_status_name == status.name) {
          currentIndex = count;
        }
      }
      statusOptions.setCurrentIndex(currentIndex);

      //cta
      var addBtn = dialog.pushButton;
      addBtn.clicked.connect(function () {
        var taskStatus = statusOptions.itemData(statusOptions.currentIndex);
        var comment = dialog.textEdit.plainText;
        var frameRender = dialog.radioButton.checked;

        if (comment != "") {
          var api = new curlImport.CURL();
          var addCommentApiUrl = globalImport.getApiEndpoint(
            "/api/actions/tasks/" + task.id + "/comment"
          );
          alert.log(addCommentApiUrl);
          var addCommentApiData = JSON.stringify({
            task_status_id: taskStatus,
            comment: comment,
            created_at: new Date(),
            person_id: packageConfig.auth_user.id,
          });
          var addCommentResponse = api.post(
            addCommentApiUrl,
            addCommentApiData,
            true
          );

          if (!addCommentResponse.msg) {
            if (!addRender) {
              alert.info("Comment has been added successfully!");
              host.pull();
              host.load();
              dialog.close();
            }
          } else {
            alert.warning("An error occured");
          }

          if (addRender) {
            var renderFile = require("../helpers/render.js").sceneRender(
              frameRender
            );
            var addPreviewApiUrl = globalImport.getApiEndpoint(
              "/api/actions/tasks/" +
                task.id +
                "/comments/" +
                addCommentResponse.id +
                "/add-preview"
            );
            var addPreviewResponse = api.post(addPreviewApiUrl, null, true);

            if (!addPreviewResponse.msg) {
              var savePreviewApiUrl = globalImport.getApiEndpoint(
                "/api/pictures/preview-files/" + addPreviewResponse.id
              );
              var savePreviewResponse = api.post(
                savePreviewApiUrl,
                null,
                true,
                renderFile
              );

              if (!savePreviewResponse.msg) {
                alert.info("Preview has been added successfully!");
                host.pull();
                host.load();
                dialog.close();
              } else {
                alert.warning("An error occured");
              }
            } else {
              alert.warning("An error occured");
            }
          }
        } else {
          alert.warning("Sorry a comment is required to continue.");
        }
      });

      dialog.exec();
    } catch (err) {
      alert.log(err);
    }
  });
}

exports.sortObjects = sortObjects;
exports.refactorDates = refactorDates;
exports.getMilliSec = getMilliSec;
exports.getFormattedDate = getFormattedDate;
exports.addPreview = addPreview;
exports.checkValues = checkValues;
exports.pullTaskStatus = pullTaskStatus;
exports.pullTaskTypes = pullTaskTypes;
exports.getSingleObject = getSingleObject;
exports.getPreviewFile = getPreviewFile;
