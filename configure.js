/**  
 * TBH-Kitsu
 * 
 * This package is a integration of Toon Boom Harmony with Kitsu. This integration creates
 * an easier production management flow by allowing creators to push task updates directly
 * from their working space to kitsu for review, tracking and compilation.
 * 
 * Kitsu is a validation tracking app for animation productions. Through its clean UI, APIs and shared database 
 * it allows you to communicate efficiently with all the shareholders of the production: Artists, 
 * Production managers, TDs, Supervisors, Vendors, and Clients. 
 */


//import global functions
var globalImport = require("./helpers/globals.js")
var alert = new globalImport.Alert()
var fileOperations = new globalImport.FileOperations()
var jsonFilePath = globalImport.localScriptsPath() + "/config.json"


//import app page functions 
var app = require("./app.js")


alert.log("Successfully loaded the TBH-Kitsu package")



function configure(packageFolder, packageName) {
    ScriptManager.addView({
        id: "TBH Kitsu",
        text: "TBH Kitsu",
        action: "initAppUI in ./configure.js"
    })
}


function initAppUI(){
    try{
        //load app base ui
        alert.log("Loaded ui")


        //check for config file
        if(fileOperations.exists(jsonFilePath)){
            var packageConfigFile = fileOperations.read(jsonFilePath)
            var packageConfig = JSON.parse(packageConfigFile)

            //check for setup details
            if(!packageConfig.kitsu_address){
                app.showPage(0)
            }else{
                //check for auth details
                if(packageConfig.access_token && packageConfig.refresh_token){

                    //check for selected active production
                    if(packageConfig.current_project.id){
                        app.showPage(3)
                    }else{
                        app.showPage(2)
                    }

                }else{
                    app.showPage(1)
                }
            }
                
        }else{
            app.showPage(0)
        }

        app.show()
    }catch(err){
        alert.log(err)
    }   
}






exports.configure = configure