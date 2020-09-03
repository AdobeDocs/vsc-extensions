import * as vscode from 'vscode';
import {getEol} from './env';
import { ExtensionContext, QuickPickOptions, QuickPickItem } from 'vscode';
import * as editorHelpers from './editorHelpers';
import * as tables from './tables';
import { addTable } from './tables';

interface CommandItem extends QuickPickItem {
    label: string,
}

class Command implements CommandItem {
    command: string;
    description?: string;
    showInCommandPalette: boolean;
    callback: ()=>void;
    label: string;

    constructor(command:string, callback:()=>void, label:string, description?:string, showInCommandPalette?:boolean) {
    this.command = command;
    this.callback = callback;
    this.label = label;
    this.description = description;
    this.showInCommandPalette = showInCommandPalette
        ? showInCommandPalette
        : false;
    }
}

var _commands: Command[] = [
    new Command(
        'toggleCitations',
        toggleCitations,
        'Toggle Citations',
        '> Citations',
        true
    ),
    new Command(
        'toggleStrikethrough',
        toggleStrikethrough,
        'Toggle Strikethrough',
        '~~Strikethrough text~~',
        true
    ),
    new Command('showCommandPalette', showCommandPalette, 'Show Command Palette', "", false),
    new Command('toggleBold', toggleBold, 'Toggle bold', '**Bold text**', true),
    new Command(
        'toggleItalic',
        toggleItalic,
        'Toggle italic',
        '_italic text_',
        true
    ),
    new Command(
        'toggleCodeBlock',
        toggleCodeBlock,
        'Toggle code block',
        '```Code block```',
        true
    ),
    new Command(
        'toggleInlineCode',
        toggleInlineCode,
        'Toggle inline code',
        '`Inline code`',
        true
    ),
    new Command(
        'toggleLink',
        toggleLink,
        'Toggle hyperlink',
        '[Link text](link_url)',
        true
    ),
    new Command(
        'toggleImage',
        toggleImage,
        'Toggle image',
        '![](image_url)',
        true
    ),
    new Command(
        'toggleBullets',
        toggleBullets,
        'Toggle bullet points',
        '* Bullet point',
        true
    ),
    new Command(
        'toggleNumbers',
        toggleNumberList,
        'Toggle number list',
        '1 Numbered list item',
        true
    ),
    new Command(
        'toggleTitleH1',
        toggleTitleH1,
        'Toggle title H1',
        '# Title',
        true
    ),
    new Command(
        'toggleTitleH2',
        toggleTitleH2,
        'Toggle title H2',
        '## Title',
        true
    ),
    new Command(
        'toggleTitleH3',
        toggleTitleH3,
        'Toggle title H3',
        '### Title',
        true
    ),
    new Command(
        'toggleTitleH4',
        toggleTitleH4,
        'Toggle title H4',
        '#### Title',
        true
    ),
    new Command(
        'toggleTitleH5',
        toggleTitleH5,
        'Toggle title H5',
        '##### Title',
        true
    ),
    new Command(
        'toggleTitleH6',
        toggleTitleH6,
        'Toggle title H6',
        '###### Title',
        true
    ),
    new Command(
        'toggleCheckboxes',
        toggleCheckboxes,
        'Toggle checkboxes',
        '- [x] Checkbox item',
        true
    ),
    new Command(
        'addTable',
        addTable,
        'Add table',
        'Tabular | values',
        true
    ),
    new Command(
        'addTableWithHeader',
        addTable,
        'Add table (with header)',
        'Tabular | values',
        true
    ),
    // Adobe Specific Commands
    new Command(
        'toggleNote',
        toggleNote,
        'Toggle note',
        '>[!NOTE]\r\n>This is a NOTE block.',
        true
    ),
    new Command(
        'toggleTip',
        toggleTip,
        'Toggle tip',
        '>[!TIP]\r\n>This is a TIP.',
        true
    ),
    new Command(
        'toggleCaution',
        toggleCaution,
        'Toggle caution',
        '>[!CAUTION]\r\n>This is a Caution block.',
        true
    ),
    new Command(
        'toggleWarning',
        toggleWarning,
        'Toggle warning',
        '>[!Warning]\r\n>This is a Warning block.',
        true
    ),
    new Command(
        'toggleImportant',
        toggleImportant,
        'Toggle Important',
        '>[!IMPORTANT]\r\n>This is a IMPORTANT block.',
        true
    ),
    new Command(
        'toggleMoreLikeThis',
        toggleMoreLikeThis,
        'Toggle More Like This',
        '>[!MORELIKETHIS]\r\n>This is a MORE LIKE THIS block.',
        true
    ),
    new Command(
        'toggleVideo',
        toggleVideo,
        'Toggle video',
        '>[!VIDEO]\r\n>())',
        true
    ),
];

let newLine = getEol();

export function register(context:ExtensionContext) {
    _commands.map(cmd => {
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'md-shortcut.' + cmd.command,
                cmd.callback
            )
        );
    });
}

function showCommandPalette() {
    const options: QuickPickOptions = {matchOnDescription: true};
    vscode.window
        .showQuickPick(
            _commands.filter(cmd => cmd.showInCommandPalette),options)
        .then(cmd => {
            if (!cmd) {return;}
            cmd.callback();
        });
}

const wordMatch: string = '[A-Za-z\\u00C0-\\u017F]';

const toggleBoldExpressions = {
    '**': new RegExp(`\\*{2}${wordMatch}*\\*{2}|${wordMatch}+`),
    __: new RegExp(`_{2}${wordMatch}*_{2}|${wordMatch}+`),
};
function toggleBold() {
    const marker:string|undefined = vscode.workspace
        .getConfiguration('markdownShortcuts.bold')
        .get('marker');

    return editorHelpers.surroundSelection(
        marker,
        marker,
        toggleBoldExpressions[marker]
    );
}

function toggleItalic() {
    const marker:string|undefined = vscode.workspace
        .getConfiguration('markdownShortcuts.italics')
        .get('marker');

    const pattern = new RegExp(
        '\\' + marker + '?' + wordMatch + '*' + '\\' + marker + '?'
    );

    return editorHelpers.surroundSelection(marker, marker, pattern);
}

const toggleStrikethroughPattern: RegExp = new RegExp(
    '~{2}' + wordMatch + '*~{2}|' + wordMatch + '+'
);
function toggleStrikethrough() {
    return editorHelpers.surroundSelection(
        '~~',
        '~~',
        toggleStrikethroughPattern
    );
}

const startingBlock: string = '```' + newLine;
const endingBlock: string = newLine + '```';
const codeBlockWordPattern : RegExp = new RegExp(
    startingBlock + '.+' + endingBlock + '|.+',
    'gm'
);
function toggleCodeBlock() {
    return editorHelpers.surroundBlockSelection(
        startingBlock,
        endingBlock,
        codeBlockWordPattern
    );
}

const toggleInlineCodePattern = new RegExp(
    '`' + wordMatch + '*`|' + wordMatch + '+'
);
function toggleInlineCode() {
    return editorHelpers.surroundSelection('`', '`', toggleInlineCodePattern);
}

const headerWordPattern = /#{1,6} .+|.+/;
function toggleTitleH1() {
    return editorHelpers.surroundSelection('# ', '', headerWordPattern);
}

function toggleTitleH2() {
    return editorHelpers.surroundSelection('## ', '', headerWordPattern);
}

function toggleTitleH3() {
    return editorHelpers.surroundSelection('### ', '', headerWordPattern);
}

function toggleTitleH4() {
    return editorHelpers.surroundSelection('#### ', '', headerWordPattern);
}

function toggleTitleH5() {
    return editorHelpers.surroundSelection('##### ', '', headerWordPattern);
}

function toggleTitleH6() {
    return editorHelpers.surroundSelection('###### ', '', headerWordPattern);
}

var AddBullets = /^(\s*)(.+)$/gm;
function toggleBullets() {
    var marker = vscode.workspace
        .getConfiguration('markdownShortcuts.bullets')
        .get('marker');

    if (!editorHelpers.isAnythingSelected()) {
        return editorHelpers.surroundSelection(
            marker + ' ',
            '',
            new RegExp('\\' + marker + ' .+|.+')
        );
    }

    var hasBullets = new RegExp('^(\\s*)\\' + marker + ' (.*)$', 'gm');

    if (editorHelpers.isBlockMatch(hasBullets)) {
        return editorHelpers.replaceBlockSelection(text =>
            text.replace(hasBullets, '$1$2')
        );
    } else {
        return editorHelpers.replaceBlockSelection(text =>
            text.replace(AddBullets, '$1' + marker + ' $2')
        );
    }
}

var HasNumbers = /^(\s*)[0-9]\.+ (.*)$/gm;
var AddNumbers = /^(\n?)(\s*)(.+)$/gm;
function toggleNumberList() {
    if (!editorHelpers.isAnythingSelected()) {
        return editorHelpers.surroundSelection('1. ', '');
    }

    if (editorHelpers.isBlockMatch(HasNumbers)) {
        return editorHelpers.replaceBlockSelection(text =>
            text.replace(HasNumbers, '$1$2')
        );
    } else {
        var lineNums = {};
        return editorHelpers.replaceBlockSelection(text =>
            text.replace(AddNumbers, (match, newline, whitespace, line) => {
                if (!lineNums[whitespace]) {
                    lineNums[whitespace] = 1;
                }
                return (
                    newline + whitespace + lineNums[whitespace]++ + '. ' + line
                );
            })
        );
    }
}

var HasCheckboxes = /^(\s*)- \[[ x]{1}\] (.*)$/gim;
var AddCheckboxes = /^(\s*)(.+)$/gm;
function toggleCheckboxes() {
    if (!editorHelpers.isAnythingSelected()) {
        return editorHelpers.surroundSelection(
            '- [ ] ',
            '',
            /- \[[ x]{1}\] .+|.+/gi
        );
    }

    if (editorHelpers.isBlockMatch(HasCheckboxes)) {
        return editorHelpers.replaceBlockSelection(text =>
            text.replace(HasCheckboxes, '$1$2')
        );
    } else {
        return editorHelpers.replaceBlockSelection(text =>
            text.replace(AddCheckboxes, '$1- [ ] $2')
        );
    }
}

var HasCitations = /^(\s*)> (.*)$/gim;
var AddCitations = /^(\s*)(.*)$/gm;
function toggleCitations() {
    if (!editorHelpers.isAnythingSelected()) {
        return editorHelpers.surroundSelection('> ', '', /> .+|.+/gi);
    }

    if (editorHelpers.isBlockMatch(HasCitations)) {
        return editorHelpers.replaceBlockSelection(text =>
            text.replace(HasCitations, '$1$2')
        );
    } else {
        return editorHelpers.prefixLines('> ');
    }
}

const MarkdownLinkRegex: RegExp = /^\[.+\]\(.+\)$/;
const UrlRegex: RegExp = /^(http[s]?:\/\/.+|<http[s]?:\/\/.+>)$/;
const MarkdownLinkWordPattern: RegExp = new RegExp('[.+](.+)|' + wordMatch + '+');
function toggleLink() {
    const editor = vscode.window.activeTextEditor;
    const selection = editor.selection;

    if (!editorHelpers.isAnythingSelected()) {
        var withSurroundingWord = editorHelpers.getSurroundingWord(
            editor,
            selection,
            MarkdownLinkWordPattern
        );

        if (withSurroundingWord != null) {
            selection = editor.selection = withSurroundingWord;
        }
    }

    if (editorHelpers.isAnythingSelected()) {
        if (editorHelpers.isMatch(MarkdownLinkRegex)) {
            //Selection is a MD link, replace it with the link text
            return editorHelpers.replaceSelection(
                text => text.match(/\[(.+)\]/)[1]
            );
        }

        if (editorHelpers.isMatch(UrlRegex)) {
            //Selection is a URL, surround it with angle brackets
            return editorHelpers.surroundSelection('<', '>');
        }
    }

    return getLinkText().then(getLinkUrl).then(addTags);

    function getLinkText() {
        if (selection.isEmpty) {
            return vscode.window.showInputBox({
                prompt: 'Link text',
            });
        }

        return Promise.resolve('');
    }

    function getLinkUrl(linkText) {
        if (linkText == null || linkText == undefined) return;

        return vscode.window
            .showInputBox({
                prompt: 'Link URL',
            })
            .then(url => {
                return { text: linkText, url: url };
            });
    }

    function addTags(options) {
        if (!options || options.url == undefined) return;

        return editorHelpers.surroundSelection(
            '[' + options.text,
            '](' + options.url + ')'
        );
    }
}

const MarkdownImageRegex = /!\[.*\]\((.+)\)/;
function toggleImage() {
    var editor = vscode.window.activeTextEditor;
    var selection = editor.selection;

    if (editorHelpers.isAnythingSelected()) {
        if (editorHelpers.isMatch(MarkdownImageRegex)) {
            //Selection is a MD link, replace it with the link text
            return editorHelpers.replaceSelection(
                text => text.match(MarkdownImageRegex)[1]
            );
        }

        if (editorHelpers.isMatch(UrlRegex)) {
            return vscode.window
                .showInputBox({
                    prompt: 'Image alt text',
                })
                .then(text => {
                    if (text === null) return;
                    editorHelpers.replaceSelection(
                        url => '![' + text + '](' + url + ')'
                    );
                });
        }
    }

    var editor = vscode.window.activeTextEditor;
    var selection = editor.selection;

    return getLinkText().then(getLinkUrl).then(addTags);

    function getLinkText() {
        if (selection.isEmpty) {
            return vscode.window.showInputBox({
                prompt: 'Image alt text',
            });
        }

        return Promise.resolve('');
    }

    function getLinkUrl(linkText:string) {
        if (linkText === null || linkText === undefined) {return;}

        return vscode.window
            .showInputBox({
                prompt: 'Image URL',
            })
            .then(url => {
                return { text: linkText, url: url };
            });
    }

    function addTags(options) {
        if (!options || !options.url) return;

        return surroundSelection(
            '![' + options.text,
            '](' + options.url + ')'
        );
    }
}

const startingNote:string = `>[!NOTE]${newLine}>{newline}>`;
const endingNote:string = newLine;
const  noteBlockWordPattern: RegEx = new RegExp(
    startingNote + '.+' + endingNote + '|.+',
    'gm'
);
function toggleNote() {
    return editorHelpers.surroundBlockSelection(
        startingNote,
        endingNote,
        noteBlockWordPattern
    );
}

var startingTip = '>[!TIP]' + newLine + '>' + newLine + '>';
var endingTip = newLine;
var tipBlockWordPattern = new RegExp(
    startingTip + '.+' + endingTip + '|.+',
    'gm'
);
function toggleTip() {
    return editorHelpers.surroundBlockSelection(
        startingTip,
        endingTip,
        tipBlockWordPattern
    );
}

var startingCaution = '>[!CAUTION]' + newLine + '>' + newLine + '>';
var endingCaution = newLine;
var cautionBlockWordPattern = new RegExp(
    startingCaution + '.+' + endingCaution + '|.+',
    'gm'
);
function toggleCaution() {
    return editorHelpers.surroundBlockSelection(
        startingCaution,
        endingCaution,
        cautionBlockWordPattern
    );
}

var startingWarning = '>[!WARNING]' + newLine + '>' + newLine + '>';
var endingWarning = newLine;
var warningBlockWordPattern = new RegExp(
    startingWarning + '.+' + endingWarning + '|.+',
    'gm'
);
function toggleWarning() {
    return editorHelpers.surroundBlockSelection(
        startingWarning,
        endingWarning,
        warningBlockWordPattern
    );
}

var startingImportant = '>[!IMPORTANT]' + newLine + '>' + newLine + '>';
var endingImportant = newLine;
var importantBlockWordPattern = new RegExp(
    startingImportant + '.+' + endingImportant + '|.+',
    'gm'
);
function toggleImportant() {
    return editorHelpers.surroundBlockSelection(
        startingImportant,
        endingImportant,
        importantBlockWordPattern
    );
}

var startingMoreLikeThis = '>[!MORELIKETHIS]' + newLine + '>*' + newLine + '>*';
var endingMoreLikeThis = newLine;
var moreLikeThisBlockWordPattern = new RegExp(
    startingMoreLikeThis + '.+' + endingMoreLikeThis + '|.+',
    'gm'
);
function toggleMoreLikeThis() {
    return editorHelpers.surroundBlockSelection(
        startingMoreLikeThis,
        endingMoreLikeThis,
        moreLikeThisBlockWordPattern
    );
}

var startingVideo = '>[!VIDEO]' + '()';
var endingVideo = newLine;
var videoBlockWordPattern = new RegExp(
    startingVideo + '.+' + endingVideo + '|.+',
    'gm'
);
function toggleVideo() {
    return editorHelpers.surroundBlockSelection(
        startingVideo,
        endingVideo,
        videoBlockWordPattern
    );
}





