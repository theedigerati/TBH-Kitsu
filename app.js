/**
 * All page functions
 */

//import CURL functions
var curlImport = require("./helpers/curl.js");

//import global functions
var globalImport = require("./helpers/globals.js");
var alert = new globalImport.Alert();
var fileOperations = new globalImport.FileOperations();
var jsonFilePath = globalImport.localScriptsPath() + "/config.json";
var packageLoc = globalImport.getPackageLoc();

//initialise app layout
try {
  var packageView = ScriptManager.getView("TBH Kitsu");
  var baseUi = ScriptManager.loadViewUI(packageView, "./ui/base.ui");
  var baseLayout = baseUi.centralwidget.verticalLayoutWidget.layout();
  var pages = ["setup.ui", "login.ui", "prods.ui", "major.ui"];
  for (count = 0; count < pages.length; count++) {
    var page = pages[count];
    var pageFile = packageLoc + "/ui/" + page;
    var pageUi = UiLoader.load(pageFile);
    var pageFrame = pageUi.centralwidget.frame;
    baseLayout.addWidget(pageFrame, 0, 0);
    baseLayout.itemAt(count).widget().hide();
  }
} catch (err) {
  alert.log(err);
}

function show() {
  baseUi.show();
}

//setup page actions
function setup() {
  try {
    //page details
    var pageIndex = 0;
    var pageFrame = baseLayout.itemAt(pageIndex).widget();
    baseLayout.setContentsMargins(250, 0, 0, 0);

    //ui elements
    var onTBServer = false;
    var kitsuLocationInput = pageFrame.groupBox.lineEdit;
    var submitBtn = pageFrame.groupBox.pushButton;
    var serverHostname = pageFrame.groupBox.lineEdit_2;
    var toggleBtn = pageFrame.groupBox.radioButton_2;
    serverHostname.hide();

    //toggle TB server hostname input
    toggleBtn.toggled.connect(function (checked) {
      if (checked) {
        serverHostname.hide();
        onTBServer = false;
      } else {
        serverHostname.show();
        onTBServer = true;
      }
    });

    var packageConfigFile = fileOperations.read(jsonFilePath)
      ? fileOperations.read(jsonFilePath)
      : "{}";
    var packageConfig = JSON.parse(packageConfigFile);
    kitsuLocationInput.text = packageConfig.kitsu_address;

    submitBtn.clicked.connect(function () {
      if (kitsuLocationInput.text == "") {
        alert.warning("Sorry, a Kitsu Address is required to continue.");
      } else {
        var config = {
          name: "TBH Kitsu",
          kitsu_address: kitsuLocationInput.text,
          access_token: "",
          refresh_token: "",
          auth_user: {},
          current_project: {},
        };

        if (onTBServer) {
          var tbServerHostname = pageFrame.groupBox.lineEdit_2;
          //check in location exists
          if (fileOperations.exists(tbServerHostname.text.toString())) {
            config.tbServerHostname = tbServerHostname.text.toString();
            saveConfig(config);
          } else {
            alert.warning("Invalid TB server hostname!");
          }
        } else {
          saveConfig(config);
        }
      }
    });
  } catch (err) {
    alert.log(err);
  }
}

//login page actions
function login() {
  try {
    //page details
    var pageIndex = 1;
    var pageFrame = baseLayout.itemAt(pageIndex).widget();
    baseLayout.setContentsMargins(250, 0, 0, 0);

    //page ui elements
    var emailInput = pageFrame.groupBox.verticalLayoutWidget_3.lineEdit;
    var passwordInput = pageFrame.groupBox.verticalLayoutWidget_3.lineEdit_3;
    var loginBtn = pageFrame.groupBox.pushButton;
    var backBtn = pageFrame.pushButton_2;

    loginBtn.clicked.connect(function () {
      var email = emailInput.text;
      var password = passwordInput.text;
      var api = new curlImport.CURL();
      var apiUrl = globalImport.getApiEndpoint("/api/auth/login");
      var apiData = JSON.stringify({ email: email, password: password });
      var response = api.post(apiUrl, apiData, false);

      if (!response || response.msg || response.message) {
        alert.warning(
          "An error occured.\nPlease make sure Kitsu is running and configured properly."
        );
      }

      if (response.login) {
        //save auth tokens to json config file
        var packageConfigFile = fileOperations.read(jsonFilePath);
        var packageConfig = JSON.parse(packageConfigFile);
        packageConfig.access_token = response.access_token;
        packageConfig.refresh_token = response.refresh_token;
        packageConfig.auth_user.id = response.user.id;
        packageConfig.auth_user.fullname = response.user.full_name;
        var jsonPackageConfig = JSON.stringify(packageConfig, null, " ");

        if (fileOperations.write(jsonFilePath, jsonPackageConfig)) {
          pageToggle(pageIndex, pageIndex + 1);
          prods();
        }
      } else {
        alert.warning("Invalid username or password");
      }
    });

    backBtn.clicked.connect(function () {
      pageToggle(pageIndex, pageIndex - 1);
      setup();
    });
  } catch (err) {
    alert.log(err);
  }
}

//productions page actions
function prods() {
  try {
    //page details
    var pageIndex = 2;
    var pageFrame = baseLayout.itemAt(pageIndex).widget();
    baseLayout.setContentsMargins(120, 0, 0, 0);

    //page ui elements
    var logoutBtn = pageFrame.pushButton;
    var table = pageFrame.verticalLayoutWidget_3.tableWidget;
    table.setColumnWidth(0, 100);

    //get all productions for user
    var api = new curlImport.CURL();
    var apiUrl = globalImport.getApiEndpoint("/api/data/user/projects/open");
    var response = api.get(apiUrl, true);

    if (response.msg || response.error) {
      if (api.refreshToken()) {
        prods();
      }
    } else if (response.length != 0) {
      var prods = response;
      table.rowCount = prods.length;
      for (count = 0; count < prods.length; count++) {
        var prod = prods[count];

        var prodName = new QTableWidgetItem(prod.name);
        prodName.setFlags(Qt.ItemIsEnabled);
        table.setItem(count, 0, prodName);

        var prodType = new QTableWidgetItem(prod.production_type);
        prodType.setFlags(Qt.ItemIsEnabled);
        table.setItem(count, 1, prodType);

        var teamLiteral =
          prod.team.length > 1
            ? prod.team.length + " members"
            : prod.team.length + " member";
        var prodTeam = new QTableWidgetItem(teamLiteral);
        prodTeam.setFlags(Qt.ItemIsEnabled);
        table.setItem(count, 2, prodTeam);

        //set cta
        var openBtn = new QPushButton("Open");
        table.setCellWidget(count, 3, openBtn);
        openProd(openBtn, prod, pageIndex);
      }
    }

    //get and display user full name
    var packageConfigFile = fileOperations.read(jsonFilePath);
    var packageConfig = JSON.parse(packageConfigFile);
    var user_fullname = packageConfig.auth_user.fullname;
    pageFrame.label_3.setText(
      '<span style="font-size:9pt; font-weight:600;">' +
        user_fullname +
        "</span>"
    );

    logoutBtn.clicked.connect(function () {
      logout(pageIndex);
    });
  } catch (err) {
    alert.log(err);
  }
}

//major page actions
function major() {
  try {
    //page details
    var pageIndex = 3;
    var pageFrame = baseLayout.itemAt(pageIndex).widget();
    pageFrame.setStyleSheet(
      "QListWidget::item:hover{background: #7fd8a0;} QListWidget::item:selected{background: transparent; color: #f1f1f1; padding-bottom: 5px; border-bottom: 2px solid #00b242;}"
    );
    baseLayout.setContentsMargins(0, 0, 0, 0);

    //config
    var packageConfigFile = fileOperations.read(jsonFilePath);
    var packageConfig = JSON.parse(packageConfigFile);

    //ui elements
    var sideNav = pageFrame.listWidget;
    var mainLayout = pageFrame.verticalLayoutWidget_3.layout();
    pageFrame.verticalLayoutWidget_3.setFixedHeight(330);
    pageFrame.label_2.setText(
      '<span style=" font-size:14pt; font-weight:600;">' +
        packageConfig.current_project.name +
        "</span>"
    );
    pageFrame.label_3.setText(
      '<span style=" font-size:9pt;">' +
        packageConfig.auth_user.fullname +
        "</span>"
    );
    var searchBox = pageFrame.lineEdit;
    var refreshBtn = pageFrame.toolButton_3;
    refreshBtn.icon = new QIcon(globalImport.getAssetsDir() + "refresh.png");
    refreshBtn.toolTip = "Refresh";
    var logoutBtn = pageFrame.toolButton_2;
    logoutBtn.icon = new QIcon(globalImport.getAssetsDir() + "logout.png");
    logoutBtn.toolTip = "Logout";

    //import page components
    var activeTasksImport = require("./components/activeTasks.js");
    var activeTasksPage = mainLayout.itemAt(0).widget();
    var activeTasks = new activeTasksImport.ActiveTasks(activeTasksPage);

    var previewsImport = require("./components/previews.js");
    var previewsPage = mainLayout.itemAt(1).widget();
    var previews = new previewsImport.Previews(previewsPage);

    var doneTasksImport = require("./components/doneTasks.js");
    var doneTasksPage = mainLayout.itemAt(2).widget();
    var doneTasks = new doneTasksImport.DoneTasks(doneTasksPage);

    var settingsImport = require("./components/settings.js");
    var settingsPage = mainLayout.itemAt(3).widget();
    var settings = new settingsImport.Settings(settingsPage.widget());

    //onload actions
    for (count = 0; count < 4; count++) {
      mainLayout.itemAt(count).widget().hide();
    }
    sideNav.currentRow = 0;
    activeTasksPage.show();
    activeTasks.load();

    //nav link actions
    sideNav.itemSelectionChanged.connect(function () {
      if (sideNav.currentItem() == sideNav.item(0)) {
        toggleComponents(mainLayout, activeTasksPage);
      }
      if (sideNav.currentItem() == sideNav.item(1)) {
        toggleComponents(mainLayout, previewsPage);
        previews.load();
      }
      if (sideNav.currentItem() == sideNav.item(2)) {
        toggleComponents(mainLayout, doneTasksPage);
        doneTasks.load();
      }
      if (sideNav.currentItem() == sideNav.item(3)) {
        toggleComponents(mainLayout, settingsPage);
        settings.load();
      }
      if (sideNav.currentItem() == sideNav.item(4)) {
        pageToggle(pageIndex, pageIndex - 1);
        prods();
      }
    });

    //search box actions
    searchBox.textChanged.connect(function (newText) {
      if (sideNav.currentItem() == sideNav.item(0)) {
        activeTasks.search(newText);
      }
      if (sideNav.currentItem() == sideNav.item(1)) {
        previews.search(newText);
      }
      if (sideNav.currentItem() == sideNav.item(2)) {
        doneTasks.search(newText);
      }
    });

    //refresh button actions
    refreshBtn.clicked.connect(function () {
      if (sideNav.currentItem() == sideNav.item(0)) {
        alert.log("loaded active tasks");
        activeTasks.pull();
        activeTasks.load();
        alert.info("Refreshed Active Tasks");
      }
      if (sideNav.currentItem() == sideNav.item(1)) {
        alert.log("loaded previews");
        previews.pull();
        previews.load();
        alert.info("Refreshed Previews");
      }
      if (sideNav.currentItem() == sideNav.item(2)) {
        alert.log("loaded done tasks");
        doneTasks.pull();
        doneTasks.load();
        alert.info("Refreshed Done Tasks");
      }
    });

    //logout
    logoutBtn.clicked.connect(function () {
      logout(pageIndex);
    });
  } catch (err) {
    alert.log(err);
  }
}

function logout(pageIndex, resetPackage) {
  var api = new curlImport.CURL();
  var apiUrl = globalImport.getApiEndpoint("/api/auth/logout");
  var response = api.get(apiUrl, true);

  if (response.logout || response.msg) {
    var packageConfigFile = fileOperations.read(jsonFilePath);
    var packageConfig = JSON.parse(packageConfigFile);
    packageConfig.access_token = "";
    packageConfig.refresh_token = "";
    (packageConfig.auth_user = {}), (packageConfig.current_project = {});
    packageConfig.kitsu_address = resetPackage
      ? ""
      : packageConfig.kitsu_address;
    var jsonPackageConfig = JSON.stringify(packageConfig, null, " ");
    fileOperations.write(jsonFilePath, jsonPackageConfig);

    if (resetPackage) {
      pageToggle(pageIndex, 0);
      setup();
    } else {
      pageToggle(pageIndex, 1);
      login();
    }
  } else {
    alert.warning("An error occured!");
  }
}

//show current page onload
function showPage(pageIndex) {
  var pageFrame = baseLayout.itemAt(pageIndex).widget();
  pageFrame.show();

  //call page function
  switch (pageIndex) {
    case 0:
      setup();
      break;
    case 1:
      login();
      break;
    case 2:
      prods();
      break;
    case 3:
      major();
      break;

    default:
      break;
  }
}

//page toggle
function pageToggle(currentPageIndex, newPageIndex) {
  var currentPageFrame = baseLayout.itemAt(currentPageIndex).widget();
  var newPageFrame = baseLayout.itemAt(newPageIndex).widget();
  newPageFrame.show();
  currentPageFrame.hide();
}

//select production
function openProd(btn, prod, pageIndex) {
  btn.clicked.connect(function () {
    var packageConfigFile = fileOperations.read(jsonFilePath);
    var packageConfig = JSON.parse(packageConfigFile);
    packageConfig.current_project.id = prod.id;
    packageConfig.current_project.name = prod.name;
    var jsonPackageConfig = JSON.stringify(packageConfig, null, " ");
    fileOperations.write(jsonFilePath, jsonPackageConfig);
    pageToggle(pageIndex, pageIndex + 1);
    major();
  });
}

function toggleComponents(layout, newPage) {
  for (count = 0; count < 4; count++) {
    layout.itemAt(count).widget().hide();
  }
  newPage.show();
}

function saveConfig(config) {
  try {
    var packageConfig = JSON.stringify(config, null, " ");
    if (fileOperations.write(jsonFilePath, packageConfig)) {
      pageToggle(0, 1);
      login();
    }
  } catch (err) {
    alert.log(err);
  }
}

// exports.load = load
exports.show = show;
exports.showPage = showPage;
exports.setup = setup;
exports.login = login;
exports.prods = prods;
