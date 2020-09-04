import * as vscode from 'vscode';
import {getEol} from './env';
import { ExtensionContext, QuickPickOptions, QuickPickItem } from 'vscode';
import * as editorHelpers from './editorHelpers';
import * as tables from './tables';
import { addTable } from './tables';
import { surroundSelection, surroundBlockSelection, isAnythingSelected, isBlockMatch, replaceBlockSelection } from './editorHelpers';

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

type BoldExpressions = {
    '**':RegExp,
    '__':RegExp,
};

const toggleBoldExpressions:BoldExpressions = {
    '**': new RegExp(`\\*{2}${wordMatch}*\\*{2}|${wordMatch}+`),
    __: new RegExp(`_{2}${wordMatch}*_{2}|${wordMatch}+`),
};
function toggleBold():void|Thenable<void>|Thenable<boolean> {
    const marker:string|undefined = vscode.workspace
        .getConfiguration('markdownShortcuts.bold')
        .get('marker');
    if (!marker) {return;}

    return surroundSelection(
        marker,
        marker,
        toggleBoldExpressions[marker]
    );
}

function toggleItalic():void|Thenable<void>|Thenable<boolean>  {
    const marker:string|undefined = vscode.workspace
        .getConfiguration('markdownShortcuts.italics')
        .get('marker');
        if (!marker) {return;}
    const pattern: RegExp = new RegExp(
        `\\${marker}?${wordMatch}*\\${marker}?`
    );

    return surroundSelection(marker, marker, pattern);
}

const toggleStrikethroughPattern: RegExp = new RegExp(
    '~{2}' + wordMatch + '*~{2}|' + wordMatch + '+'
);
function toggleStrikethrough() {
    return surroundSelection(
        '~~',
        '~~',
        toggleStrikethroughPattern
    );
}

const startingBlock: string = '```' + newLine;
const endingBlock: string = newLine + '```';
const codeBlockWordPattern : RegExp = new RegExp(
    `${startingBlock}.+${endingBlock}|.+`,
    'gm'
);
function toggleCodeBlock() {
    return surroundBlockSelection(
        startingBlock,
        endingBlock,
        codeBlockWordPattern
    );
}

const toggleInlineCodePattern = new RegExp(
    '`' + wordMatch + '*`|' + wordMatch + '+'
);
function toggleInlineCode() {
    return surroundSelection('`', '`', toggleInlineCodePattern);
}

const headerWordPattern = /#{1,6} .+|.+/;
function toggleTitleH1() {
    return surroundSelection('# ', '', headerWordPattern);
}

function toggleTitleH2() {
    return surroundSelection('## ', '', headerWordPattern);
}

function toggleTitleH3() {
    return surroundSelection('### ', '', headerWordPattern);
}

function toggleTitleH4() {
    return surroundSelection('#### ', '', headerWordPattern);
}

function toggleTitleH5() {
    return surroundSelection('##### ', '', headerWordPattern);
}

function toggleTitleH6() {
    return surroundSelection('###### ', '', headerWordPattern);
}

var AddBullets = /^(\s*)(.+)$/gm;
function toggleBullets() {
    var marker = vscode.workspace
        .getConfiguration('markdownShortcuts.bullets')
        .get('marker');

    if (!isAnythingSelected()) {
        return surroundSelection(
            marker + ' ',
            '',
            new RegExp('\\' + marker + ' .+|.+')
        );
    }

    var hasBullets = new RegExp('^(\\s*)\\' + marker + ' (.*)$', 'gm');

    if (isBlockMatch(hasBullets)) {
        return replaceBlockSelection(text =>
            text.replace(hasBullets, '$1$2')
        );
    } else {
        return replaceBlockSelection(text =>
            text.replace(AddBullets, '$1' + marker + ' $2')
        );
    }
}

const HasNumbers:RegExp = /^(\s*)[0-9]\.+ (.*)$/gm;
const AddNumbers:RegExp = /^(\n?)(\s*)(.+)$/gm;
function toggleNumberList() {
    if (!isAnythingSelected()) {
        return surroundSelection('1. ', '');
    }

    if (isBlockMatch(HasNumbers)) {
        return replaceBlockSelection(text =>
            text.replace(HasNumbers, '$1$2')
        );
    } else {
        var lineNums = {};
        return replaceBlockSelection(text =>
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
    if (!isAnythingSelected()) {
        return surroundSelection(
            '- [ ] ',
            '',
            /- \[[ x]{1}\] .+|.+/gi
        );
    }

    if (isBlockMatch(HasCheckboxes)) {
        return replaceBlockSelection(text =>
            text.replace(HasCheckboxes, '$1$2')
        );
    } else {
        return replaceBlockSelection(text =>
            text.replace(AddCheckboxes, '$1- [ ] $2')
        );
    }
}

const HasCitations = /^(\s*)> (.*)$/gim;
const AddCitations = /^(\s*)(.*)$/gm;

function toggleCitations() {
    if (!isAnythingSelected()) {
        return surroundSelection('> ', '', /> .+|.+/gi);
    }

    if (isBlockMatch(HasCitations)) {
        return replaceBlockSelection(text =>
            text.replace(HasCitations, '$1$2')
        );
    } else {
        return prefixLines('> ');
    }
}

const MarkdownLinkRegex: RegExp = /^\[.+\]\(.+\)$/;
const UrlRegex: RegExp = /^(http[s]?:\/\/.+|<http[s]?:\/\/.+>)$/;
const MarkdownLinkWordPattern: RegExp = new RegExp('[.+](.+)|' + wordMatch + '+');
function toggleLink() {
    const editor = vscode.window.activeTextEditor;
    const selection = editor.selection;

    if (!isAnythingSelected()) {
        var withSurroundingWord = getSurroundingWord(
            editor,
            selection,
            MarkdownLinkWordPattern
        );

        if (withSurroundingWord != null) {
            selection = editor.selection = withSurroundingWord;
        }
    }

    if (isAnythingSelected()) {
        if (isMatch(MarkdownLinkRegex)) {
            //Selection is a MD link, replace it with the link text
            return replaceSelection(
                text => text.match(/\[(.+)\]/)[1]
            );
        }

        if (isMatch(UrlRegex)) {
            //Selection is a URL, surround it with angle brackets
            return surroundSelection('<', '>');
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

        return surroundSelection(
            '[' + options.text,
            '](' + options.url + ')'
        );
    }
}

const MarkdownImageRegex = /!\[.*\]\((.+)\)/;
function toggleImage() {
    var editor = vscode.window.activeTextEditor;
    var selection = editor.selection;

    if (isAnythingSelected()) {
        if (isMatch(MarkdownImageRegex)) {
            //Selection is a MD link, replace it with the link text
            return replaceSelection(
                text => text.match(MarkdownImageRegex)[1]
            );
        }

        if (isMatch(UrlRegex)) {
            return vscode.window
                .showInputBox({
                    prompt: 'Image alt text',
                })
                .then(text => {
                    if (text === null) return;
                    replaceSelection(
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
    return surroundBlockSelection(
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
    return surroundBlockSelection(
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
    return surroundBlockSelection(
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
    return surroundBlockSelection(
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
    return surroundBlockSelection(
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
    return surroundBlockSelection(
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
    return surroundBlockSelection(
        startingVideo,
        endingVideo,
        videoBlockWordPattern
    );
}





