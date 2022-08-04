const myArgs = process.argv.slice(2);
const readline = require('readline');
const fs = require('fs');

const symbol = /\[|]|{|}|\(|\)|\.|\,|\;|\+|-|\=|\*|<|>|\&|\/|\~|\|/g;
const keyword =
    /^(class|constructor|function|method|field|static|var|int|char|boolean|void|true|false|null|this|let|do|if|else|while|return)$/g;
const stringConstant = /\"(\\.|[^\"])*\"/gm;
const integerConstant = /[0-9]/gm;
const identifier = /^[_a-zA-Z][_a-zA-Z0-9]{0,}/g;
const varType = /(int|char|boolean)/g;
const statements = /(let|if|while|do|return)/g;
const keywordConstant = /(true|false|null|this)/g;
const op = new RegExp(/(\+|-|\*|\||\/|&|<|>|=)/);
const unaryOp = new RegExp(/(-|~)/g);

function JackTokenizer(fileName) {
    let tokenized = '';

    const rl = readline.createInterface({
        input: fs.createReadStream(fileName),
    });

    rl.on('line', (line) => {
        // Remove all additionals white spaces
        line = line.replace(/\s+/g, ' ');

        // Remove comments
        if (line.includes('//')) {
            line = line.substr(0, line.indexOf('//'));
        }

        if (line.includes('/**') || line.startsWith(' *')) {
            line = line.substr(0, line.indexOf('/**'));
        }

        // if (line.startsWith(/\*/g)) {
        // line = line.substr(0, line.indexOf('*'));
        // }

        console.log(line);

        // Ignore empty string lines
        if (line.length > 0) {
            line = line.split(
                /(?=\[|]|{|}|\(|\)|\.|\,|\;|\+|-| |\=|\*|<|>|\&|\/|\~|\|)|(?<=\[|]|{|}|\(|\)|\.|\,|\;|\+|-| |\=|\*|<|>|\&|\/|\~|\|)/g,
            );
            line = line.filter((item) => item !== ' ');
            line = line.join(' ');
            line = line.match(/(?:[^\s"]+|"[^"]*")+/g);

            line &&
                line.forEach((l) => {
                    if (l.match(symbol)) {
                        tokenized += `<symbol> ${l} </symbol>\n`;
                    }
                    if (l.match(keyword)) {
                        tokenized += `<keyword> ${l} </keyword>\n`;
                    }
                    if (l.match(stringConstant)) {
                        tokenized += `<stringConstant> ${l} </stringConstant>\n`;
                    }
                    if (l.match(integerConstant)) {
                        tokenized += `<integerConstant> ${l} </integerConstant>\n`;
                    }
                    if (l.match(identifier) && !l.match(keyword)) {
                        tokenized += `<identifier> ${l} </identifier>\n`;
                    }
                });
        }
    });

    rl.on('close', () => {
        writeXMLFile(CompilationEngine(tokenized.trim()));
    });
}

function CompilationEngine(tokenized) {
    const tokenArr = tokenized.split('\n');

    let result = '';
    let i = 0;

    const write = (text, t, i) => {
        if (text) {
            result += `${text}\n`;
            return;
        }
        result += `${t[i]}\n`;
    };

    while (i < tokenArr.length) {
        i = compileClass(tokenArr, i, write);
    }
    return result;
}

function compileClass(t, i, write) {
    if (t[i].match(/class/)) {
        write('<class>');
        i = writeKeyword(t, i, write);
        i = writeIdentifier(t, i, write);
        i = writeSymbol(t, i, write);
        while (t[i].match(/(static|field)/)) {
            i = compileClassVarDec(t, i, write);
        }

        while (t[i].match(/(constructor|function|method)/)) {
            i = compileSubroutineDec(t, i, write);
        }

        i = writeSymbol(t, i, write);
        write('</class>');

        return i;
    }
}
function compileClassVarDec(t, i, write) {
    write('<classVarDec>');
    i = writeKeyword(t, i, write);
    i = writeType(t, i, write) || writeIdentifier(t, i, write);
    i = writeIdentifier(t, i, write);
    while (t[i].match(/,/)) {
        i = writeSymbol(t, i, write);
        i = writeIdentifier(t, i, write);
    }
    i = writeSymbol(t, i, write);
    write('</classVarDec>');

    return i;
}
function compileSubroutineDec(t, i, write) {
    write('<subroutineDec>');
    i = writeKeyword(t, i, write);
    if (t[i].match(/void/) || t[i].match(varType)) {
        i = writeKeyword(t, i, write);
    } else {
        i = writeIdentifier(t, i, write);
    }
    i = writeIdentifier(t, i, write);
    i = writeSymbol(t, i, write);
    i = compileParameterList(t, i, write);
    i = writeSymbol(t, i, write);
    i = compileSubroutineBody(t, i, write);

    write('</subroutineDec>');

    return i;
}
function compileParameterList(t, i, write) {
    write('<parameterList>');
    if (!t[i].match(/\)/)) {
        i = writeType(t, i, write) || writeIdentifier(t, i, write);
        i = writeIdentifier(t, i, write);
        while (t[i].match(/,/)) {
            i = writeSymbol(t, i, write);
            i = writeType(t, i, write) || writeIdentifier(t, i, write);
            i = writeIdentifier(t, i, write);
        }
    }
    write('</parameterList>');

    return i;
}
function compileSubroutineBody(t, i, write) {
    write('<subroutineBody>');
    i = writeSymbol(t, i, write);
    while (t[i].match(/var|let|if|while|do|return/)) {
        while (t[i].match(/(var)/)) {
            i = compileVarDec(t, i, write);
        }
        i = compileStatements(t, i, write);
    }
    i = writeSymbol(t, i, write);
    write('</subroutineBody>');

    return i;
}
function compileVarDec(t, i, write) {
    write('<varDec>');
    i = writeKeyword(t, i, write);
    i = writeType(t, i, write) || writeIdentifier(t, i, write);
    i = writeIdentifier(t, i, write);
    while (t[i].match(/,/)) {
        i = writeSymbol(t, i, write);
        i = writeIdentifier(t, i, write);
    }
    i = writeSymbol(t, i, write);

    write('</varDec>');
    return i;
}
function compileStatements(t, i, write) {
    write('<statements>');

    while (t[i].match(statements)) {
        if (t[i].match(/let/)) {
            write(`<letStatement>`);
            i = compileLet(t, i, write);
            write(`</letStatement>`);
        }
        if (t[i].match(/if/)) {
            write(`<ifStatement>`);
            i = compileIf(t, i, write);
            write(`</ifStatement>`);
        }
        if (t[i].match(/while/)) {
            write(`<whileStatement>`);
            i = compileWhile(t, i, write);
            write(`</whileStatement>`);
        }
        if (t[i].match(/do/)) {
            write(`<doStatement>`);
            i = compileDo(t, i, write);
            write(`</doStatement>`);
        }
        if (t[i].match(/return/)) {
            write(`<returnStatement>`);
            i = compileReturn(t, i, write);
            write(`</returnStatement>`);
        }
    }

    write('</statements>');

    return i;
}

function compileLet(t, i, write) {
    i = writeKeyword(t, i, write);
    i = writeIdentifier(t, i, write);

    if (t[i].match(/\[/g)) {
        i = writeSymbol(t, i, write);
        i = compileExpression(t, i, write);
        i = writeSymbol(t, i, write);
    }

    i = writeSymbol(t, i, write);
    i = compileExpression(t, i, write);
    i = writeSymbol(t, i, write);

    return i;
}
function compileIf(t, i, write) {
    i = writeKeyword(t, i, write);
    i = writeSymbol(t, i, write);
    i = compileExpression(t, i, write);
    i = writeSymbol(t, i, write);
    i = writeSymbol(t, i, write);
    i = compileStatements(t, i, write);
    i = writeSymbol(t, i, write);
    if (t[i].match(/else/g)) {
        i = writeKeyword(t, i, write);
        i = writeSymbol(t, i, write);
        i = compileStatements(t, i, write);
        i = writeSymbol(t, i, write);
    }

    return i;
}
function compileWhile(t, i, write) {
    i = writeKeyword(t, i, write);
    i = writeSymbol(t, i, write);
    i = compileExpression(t, i, write);
    i = writeSymbol(t, i, write);
    i = writeSymbol(t, i, write);
    i = compileStatements(t, i, write);
    i = writeSymbol(t, i, write);
    return i;
}
function compileDo(t, i, write) {
    i = writeKeyword(t, i, write);
    i = writeIdentifier(t, i, write);
    i = compileSubroutineCall(t, i, write);
    i = writeSymbol(t, i, write);
    return i;
}
function compileReturn(t, i, write) {
    i = writeKeyword(t, i, write);
    if (!t[i].match(/;/g)) {
        i = compileExpression(t, i, write);
    }
    i = writeSymbol(t, i, write);
    return i;
}

function compileExpression(t, i, write) {
    write('<expression>');

    i = compileTerm(t, i, write);

    const opCode = t[i]
        .substring(t[i].indexOf('>') + 1, t[i].lastIndexOf('<'))
        .trim();

    if (opCode.match(op)) {
        i = writeSymbol(t, i, write);
        i = compileTerm(t, i, write);
    }

    write('</expression>');

    return i;
}
function compileTerm(t, i, write) {
    write('<term>');

    if (t[i].match(unaryOp)) {
        i = writeSymbol(t, i, write);
        i = compileTerm(t, i, write);
    }

    // integerConstant
    if (t[i].match(integerConstant)) {
        write(null, t, i);
        i++;
    }

    // stringConstant
    if (t[i].match(stringConstant)) {
        const removedDoubleQuote = t[i].replace(/"/gm, '');
        write(removedDoubleQuote);
        i++;
    }

    // varName
    if (t[i].match(/identifier/g)) {
        i = writeIdentifier(t, i, write);
        if (t[i].match(/\[/)) {
            i = writeSymbol(t, i, write);
            i = compileExpression(t, i, write);
            i = writeSymbol(t, i, write);
        }
        if (t[i].match(/\(/) || t[i].match(/\./)) {
            i = compileSubroutineCall(t, i, write);
        }
    }

    // keywordConstant
    if (t[i].match(keywordConstant)) {
        i = writeKeyword(t, i, write);
    }

    // expression
    if (t[i].match(/\(/)) {
        i = writeSymbol(t, i, write);
        i = compileExpression(t, i, write);
        i = writeSymbol(t, i, write);
    }

    write('</term>');
    return i;
}
function compileExpressionList(t, i, write) {
    write('<expressionList>');

    if (!t[i].match(/\)/)) {
        i = compileExpression(t, i, write);
        while (t[i].match(/,/)) {
            i = writeSymbol(t, i, write);
            i = compileExpression(t, i, write);
        }
    }
    write('</expressionList>');

    return i;
}

function compileSubroutineCall(t, i, write) {
    if (t[i].match(/\(/g)) {
        i = writeSymbol(t, i, write);
        i = compileExpressionList(t, i, write);
        i = writeSymbol(t, i, write);
        return i;
    }

    if (t[i].match(/\./)) {
        i = writeSymbol(t, i, write);

        i = writeIdentifier(t, i, write);
        i = writeSymbol(t, i, write);
        i = compileExpressionList(t, i, write);
        i = writeSymbol(t, i, write);
        return i;
    }
}

function writeKeyword(t, i, write) {
    if (t[i].match(/keyword/g)) {
        write(null, t, i);
        i++;
        return i;
    }
}
function writeIdentifier(t, i, write) {
    if (t[i].match(/identifier/g)) {
        write(null, t, i);
        i++;
        return i;
    }
    return null;
}
function writeSymbol(t, i, write) {
    if (t[i].match(symbol) && t[i].match(/<symbol>/)) {
        write(null, t, i);
        i++;
        return i;
    }
}
function writeType(t, i, write) {
    if (t[i].match(/(int|char|boolean)/)) {
        write(null, t, i);
        i++;
        return i;
    }
    return null;
}

function writeXMLFile(str) {
    const fileName = myArgs[0];
    const outputFileName =
        fileName.substr(0, fileName.lastIndexOf('.')) + '_solution.xml';
    // const outputfile = array.join('\n');
    console.log(outputFileName);
    fs.writeFile(`${outputFileName}`, str, (err) => {
        if (err) throw err;
    });
}

JackTokenizer(myArgs[0]);
