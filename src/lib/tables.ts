import * as vscode from 'vscode';
import * as editorHelpers from './editorHelpers';
import { isAnythingSelected } from './editorHelpers';


var sampleTable = [
    "",
    "|Column A | Column B | Column C |",
    "|---------|----------|---------|",
    "| A1 | B1 | C1 |",
    "| A2 | B2 | C2 |",
    "| A3 | B3 | C3 |"
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
    const firstRow:RegExpMatchArray|null = text.match(/.+/); 
    
    var columnSeparators:RegExpMatchArray|null = firstRow === null ? null : firstRow[0].match(tableColumnSeparator);
    var columnCount:number = columnSeparators === null ? 0 : columnSeparators.length;
    var line1 = [];
    for (var i = 0; i < columnCount + 1; i++) {
        line1.push("column" + i);
    }
    var tableHeader = line1.join(" | ") + "\n";
    tableHeader = tableHeader + tableHeader.replace(/[a-z0-9]/gi, "-");

    return tableHeader + text.replace(tableColumnSeparator, " | ");
}

function convertToTableWithHeader(text:string):string {
    const textAsTable:string = text.replace(tableColumnSeparator, " | ");
    const restOfTable: RegExpMatchArray|null = textAsTable.match(/.+/);
    const firstRow: string|null = restOfTable && restOfTable[0]; 
    if (!firstRow) {return(text);}
    const headerSep: string = firstRow.replace(/[^\|]/gi, "-");
    
    return firstRow + "\n" + headerSep + textAsTable.substring(firstRow.length);
}