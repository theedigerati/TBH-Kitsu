/**
 * Page component - PREVIEWS
 * N.B: global functions were not imported here because
 * this file is used in the middle of the "app.js" file
 * which already as all the imports.
 */

//config data
var packageConfigFile = fileOperations.read(jsonFilePath);
var packageConfig = JSON.parse(packageConfigFile);

//partials import
var partials = require("./partials.js");

/**
 * Class for "Previews" section
 * @param {*} table
 */

function Previews(table) {
  this.table = table;
  this.pull();
}

/**
 * Get all previews from active and done tasks
 * from API resource, clean and sort them.
 */
Previews.prototype.pull = function () {
  var api = new curlImport.CURL();

  this.tasks = [];
  var previews = [];

  var activeTasks = this.getTasks(false);
  var doneTasks = this.getTasks(true);
  Array.prototype.push.apply(this.tasks, activeTasks, doneTasks);

  for (count = 0; count < this.tasks.length; count++) {
    var task = this.tasks[count];
    var apiUrl = globalImport.getApiEndpoint(
      "/api/data/tasks/" + task.id + "/comments"
    );
    var response = api.get(apiUrl, true);
    Array.prototype.push.apply(previews, response);
  }

  previews = partials.sortObjects(partials.refactorDates(previews), "created");
  this.previews = previews;
  this.fallbackPreviews = previews; //fallback data when search is empty
  this.tasksStatus = partials.pullTaskStatus();
  this.tasksTypes = partials.pullTaskTypes();
};

/**
 * Load the "Previews" view and populate with data.
 */
Previews.prototype.load = function () {
  var previews = this.previews;
  this.table.rowCount = previews.length;
  this.table.setColumnWidth(0, 150);
  this.table.setColumnWidth(1, 105);
  this.table.setColumnWidth(4, 75);
  for (count = 0; count < previews.length; count++) {
    var preview = previews[count];

    //preview comment
    var previewComment = new QTableWidgetItem(
      preview.text ? preview.text : "---"
    );
    previewComment.setFlags(Qt.ItemIsEnabled);
    this.table.setItem(count, 0, previewComment);

    //preview file
    var previewFile = partials.getPreviewFile(preview);
    previewFile.setProperty("class", "edited");
    previewFile.openExternalLinks = true;
    this.table.setCellWidget(count, 1, previewFile);

    //task type
    var task = partials.getSingleObject(this.tasks, preview.object_id);
    var taskTypeHtml = "<div>" + task.task_type_name + "</div>";
    var taskType = new QLabel(taskTypeHtml);
    taskType.setProperty("class", "task-type-" + task.task_type_name);
    this.table.setCellWidget(count, 2, taskType);

    //task entity
    var entity = "";
    if (task.episode_name) {
      entity += task.episode_name + " |";
    }
    if (task.sequence_name) {
      entity += task.sequence_name + " | ";
    }
    entity += task.entity_name;
    var entityHtml =
      "<h4 style='margin: 0;'>" +
      entity +
      "</h4> <p style='margin: 0; margin-top: 3px; font-size: 10px;'>" +
      task.entity_type_name +
      "</p>";
    var taskEntity = new QLabel(entityHtml);
    taskEntity.setProperty("class", "edited");
    this.table.setCellWidget(count, 3, taskEntity);

    //task status
    var taskStatusHtml =
      "<div style='text-transform: uppercase; text-align: center;'>" +
      task.task_status_short_name +
      "</div>";
    var taskStatus = new QLabel(taskStatusHtml);
    taskStatus.alignment = Qt.AlignHCenter;
    taskStatus.setProperty(
      "class",
      "task-status-" + task.task_status_short_name
    );
    this.table.setCellWidget(count, 4, taskStatus);

    //added by
    var date = partials.getFormattedDate(preview.created_at, true);
    var addedByHtml =
      "<h4 style='margin: 0;'>" +
      preview.person.first_name +
      "</h4> <p style='margin: 0; margin-top: 3px; font-size: 10px;'>" +
      date +
      "</p>";
    var addedBy = new QLabel(addedByHtml);
    addedBy.setProperty("class", "edited");
    this.table.setCellWidget(count, 5, addedBy);
  }

  //styling
  var styles = require("./styles.js");
  this.table.setStyleSheet(
    styles.taskTypesStyles(this.tasksTypes, true) +
      styles.taskStatusStyles(this.tasksStatus, true) +
      styles.editedLabel()
  );
};

/**
 * Get Tasks - could be active or done
 * @param {*} getDone
 * @returns
 */
Previews.prototype.getTasks = function (getDone) {
  var apiRoute = getDone ? "/api/data/user/done-tasks" : "/api/data/user/tasks";
  var api = new curlImport.CURL();
  var apiUrl = globalImport.getApiEndpoint(apiRoute);
  var response = api.get(apiUrl, true);

  if (response.msg || response.error) {
    if (api.refreshToken()) {
      this.getTasks(getDone);
    }
  } else {
    var tasks = response;
    //clean and sort data
    tasks = tasks.filter(function (task) {
      return task.project_id == packageConfig.current_project.id;
    });
    return tasks;
  }
};

/**
 * Perform search operation on task previews
 * by filtering the js array of task preview objects
 */
Previews.prototype.search = function (newText) {
  var tasks = this.tasks;
  var searchValues = newText.split(" ");
  searchValues.forEach(function (searchValue, index) {
    var searchArray = index == 0 ? this.fallbackPreviews : this.previews;
    this.previews = searchArray.filter(function (preview) {
      return partials.checkValues(preview, searchValue, tasks);
    });
  }, this);
  if (newText == "") {
    this.previews = this.fallbackPreviews;
  }
  this.load();
};

exports.Previews = Previews;
