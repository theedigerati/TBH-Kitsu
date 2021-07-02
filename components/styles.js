/**
 * Styles for task type ad task status
 */

function taskTypesStyles(types, forPreview){ 
    var style = ""
    var margin = forPreview ? "margin: 15px 10px;" : "margin: 15px 10px;"
    for(count = 0; count < types.length; count++){
        var type = types[count]
        style += "QLabel.task-type-" + type.name + " {font-size: 12px; background: #424242; border-left: 5px solid " + type.color + ";" + margin +"}"
    }
    return style
}

function taskStatusStyles(types, forPreview){
    var style = ""
    var margin = forPreview ? "margin: 16px 10px;" : "margin: 16px 10px;"
    for(count = 0; count < types.length; count++){
        var type = types[count]
        style += " QLabel.task-status-" + type.short_name + " {padding-top: 6px; border-radius: 12px; font-size: 11px; color: #f1f1f1; background: " + adjustTodoColor(type) + ";" + margin +"}"
    }
    return style
}

function adjustTodoColor(status){
    if(status.short_name == "todo"){
        return "#585858"
    }else{
        return status.color
    }
}


function editedLabel(){
    return "QLabel.edited{background: transparent; margin-left: 5px;}"
}




exports.taskTypesStyles = taskTypesStyles
exports.taskStatusStyles = taskStatusStyles
exports.editedLabel = editedLabel