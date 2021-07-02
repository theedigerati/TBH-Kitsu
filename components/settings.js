/**
 * Page component - SETTINGS
 * N.B: global functions were not imported here because
 * this file is used in the middle of the "app.js" file 
 * which already as all the imports.
 */


//config data
var packageConfigFile = fileOperations.read(jsonFilePath)
var packageConfig = JSON.parse(packageConfigFile)

//partials import
var partials = require("./partials.js")


/**
 * Class for "Done Tasks" section
 * @param {*} table 
 */

function Settings(container){
    this.container = container
    this.pull()
}




/**
 * Get user and app details
 */
 Settings.prototype.pull = function() {
    var api = new curlImport.CURL()
    //pull tasks
    var apiUrl = globalImport.getApiEndpoint("/api/data/user/context")
    var response = api.get(apiUrl, true)

    if(response.msg || response.error){
        if(api.refreshToken()){
            this.pull()
        }
    }else{
        var user = partials.getSingleObject(response.persons, packageConfig.auth_user.id)
        this.user = user
    }
}





/**
 * Load the "Settings" view and populate with data.
 */
Settings.prototype.load = function(){
    try{
        this.container.fullname.setText("<span style='font-size:10pt'><b>"+ this.user.full_name +"</b></span>")
        this.container.email.setText("<span style='font-size:10pt'><b>"+ this.user.email +"</b></span>")
        this.container.role.setText("<span style='font-size:10pt'><b>"+ this.user.role +"</b></span>")
        this.container.kitsu_address.setText("<span style='font-size:10pt'><b>"+ packageConfig.kitsu_address +"</b></span>")

        this.container.logout_btn.clicked.connect(function() {
            logout(3)
        })

        this.container.reset_btn.clicked.connect(function() {
            logout(3, true)
        })
    }catch(err){
        alert.log(err)
    }
    
}





exports.Settings = Settings