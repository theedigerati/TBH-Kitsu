/**
 * Page component - DONE TASKS
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
 * Class for "Done Tasks" section
 * @param {*} table
 */

function DoneTasks(table) {
  this.table = table;
  this.pull();
}

/**
 * Get all done tasks from API resource,
 * clean and sort them.
 */
DoneTasks.prototype.pull = function () {
  var api = new curlImport.CURL();
  //pull tasks
  var apiUrl = globalImport.getApiEndpoint("/api/data/user/done-tasks");
  var response = api.get(apiUrl, true);

  if (response.msg || response.error) {
    if (api.refreshToken()) {
      this.pull();
    }
  } else {
    var tasks = response;
    this.tasksTypes = partials.pullTaskTypes();

    //clean and sort data
    tasks = tasks.filter(function (task) {
      return task.project_id == packageConfig.current_project.id;
    });
    tasks = partials.sortObjects(partials.refactorDates(tasks), "updated");
    this.fallbackDoneTasks = tasks; //fallback data when search is empty
    this.doneTasks = tasks;

    //get previews
    this.previews = [];
    for (count = 0; count < this.doneTasks.length; count++) {
      var task = this.doneTasks[count];
      var apiUrl = globalImport.getApiEndpoint(
        "/api/data/tasks/" + task.id + "/comments"
      );
      var response = api.get(apiUrl, true);
      Array.prototype.push.apply(this.previews, response);
    }
  }
};

/**
 * Load the "Active Tasks" view and populate with data.
 */
DoneTasks.prototype.load = function () {
  var tasks = this.doneTasks;
  this.table.rowCount = tasks.length;
  this.table.setColumnWidth(2, 80);
  this.table.setColumnWidth(3, 155);
  this.table.setColumnWidth(4, 100);
  for (count = 0; count < tasks.length; count++) {
    var task = tasks[count];

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
    this.table.setCellWidget(count, 0, taskEntity);

    //task type
    var taskTypeHtml = "<div style=''>" + task.task_type_name + "</div>";
    var taskType = new QLabel(taskTypeHtml);
    taskType.setProperty("class", "task-type-" + task.task_type_name);
    this.table.setCellWidget(count, 1, taskType);

    //task due date
    var date = "No due date";
    if (task.task_due_date) {
      var dateSec = partials.getMilliSec(task.due_date);
      date = partials.getFormattedDate(dateSec);
    }
    var taskDueDate = new QTableWidgetItem(date);
    taskDueDate.setFlags(Qt.ItemIsEnabled);
    this.table.setItem(count, 2, taskDueDate);

    //last comment
    var lastComment = new QTableWidgetItem(
      task.last_comment.text ? task.last_comment.text : "---"
    );
    lastComment.setFlags(Qt.ItemIsEnabled);
    this.table.setItem(count, 3, lastComment);

    //last preview file
    var taskPreviews = this.previews.filter(function (preview) {
      return preview.object_id == task.id;
    });
    var previewFile = partials.getPreviewFile(
      taskPreviews[0] ? taskPreviews[0] : {}
    );
    previewFile.setProperty("class", "edited");
    previewFile.openExternalLinks = true;
    this.table.setCellWidget(count, 4, previewFile);

    //task done date
    var date = partials.getFormattedDate(task.created_at, true);
    var taskDoneDate = new QTableWidgetItem(date);
    taskDoneDate.setFlags(Qt.ItemIsEnabled);
    this.table.setItem(count, 5, taskDoneDate);
  }

  //styling
  var styles = require("./styles.js");
  this.table.setStyleSheet(
    styles.taskTypesStyles(this.tasksTypes) + styles.editedLabel()
  );
};

/**
 * Perform search operation on done tasks
 * by filtering the js array of done task objects
 */
DoneTasks.prototype.search = function (newText) {
  var searchValues = newText.split(" ");
  searchValues.forEach(function (searchValue, index) {
    var searchArray = index == 0 ? this.fallbackDoneTasks : this.doneTasks;
    this.doneTasks = searchArray.filter(function (preview) {
      return partials.checkValues(preview, searchValue);
    });
  }, this);
  if (newText == "") {
    this.doneTasks = this.fallbackDoneTasks;
  }
  this.load();
};

exports.DoneTasks = DoneTasks;
