import * as vscode from 'vscode';
import * as editorHelpers from './editorHelpers';
import { isAnythingSelected } from './editorHelpers';


var sampleTable = [
    "",
    "Column A | Column B | Column C",
    "---------|----------|---------",
    " A1 | B1 | C1",
    " A2 | B2 | C2",
    " A3 | B3 | C3"
    ].join("\n");

export function addTable(addHeader:boolean=false) {
    var editFunc;
    if (!isAnythingSelected()) {
        editFunc = () => sampleTable;
    }
    else if (addHeader) {
        editFunc = convertToTableWithHeader;
    }
    else {
        editFunc = convertToTableWithoutHeader;
    }
    editorHelpers.replaceBlockSelection(editFunc);
}

const tableColumnSeparator:RegExp = /([ ]{2,}|[\t])/gi;
function convertToTableWithoutHeader(text:string) {
    var firstRow = text.match(/.+/); 
    
    var columnSeparators = firstRow == null ? null : firstRow[0].match(tableColumnSeparator);
    var columnCount = columnSeparators === null ? 0 : columnSeparators.length;
    var line1 = [];
    for (var i = 0; i < columnCount + 1; i++) {
        line1.push("column" + i);
    }
    var tableHeader = line1.join(" | ") + "\n";
    tableHeader = tableHeader + tableHeader.replace(/[a-z0-9]/gi, "-");

    return tableHeader + text.replace(tableColumnSeparator, " | ");
}

function convertToTableWithHeader(text) {
    var textAsTable = text.replace(tableColumnSeparator, " | ");

    var firstRow = textAsTable.match(/.+/)[0]; 
    
    var headerLine = firstRow.replace(/[^\|]/gi, "-");
    
    return firstRow + "\n" + headerLine + textAsTable.substring(firstRow.length);
}