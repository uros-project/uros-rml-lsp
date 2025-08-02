import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    TextDocumentSyncKind,
    InitializeResult,
    Diagnostic,
    DiagnosticSeverity
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import antlr4 from 'antlr4';
// 修复后的导入语句，使用默认导入
import UrosRMLLexer from './parser/src/grammar/UrosRMLLexer';
import UrosRMLParser from './parser/src/grammar/UrosRMLParser';

// 创建一个连接，使用Node的IPC
const connection = createConnection(ProposedFeatures.all);

// 创建一个简单的文档管理器
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;
    hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
    hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Full,
            // 添加其他功能，如完成、悬停等
        }
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }
    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

// 在文档内容改变时进行验证
documents.onDidChangeContent(change => {
    validateTextDocument(change.document);
});

// 自定义错误监听器，用于捕获 ANTLR 的语法错误
class UrosRMLErrorListener extends antlr4.ErrorListener<any> {
    private diagnostics: Diagnostic[] = [];

    constructor(private uri: string) {
        super();
    }

    syntaxError(
        recognizer: antlr4.Recognizer<antlr4.Token>,
        offendingSymbol: antlr4.Token,
        line: number,
        charPositionInLine: number,
        msg: string,
        e: antlr4.RecognitionException | undefined
    ) {
        const diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: {
                start: { line: line - 1, character: charPositionInLine },
                end: { line: line - 1, character: charPositionInLine + (offendingSymbol ? offendingSymbol.text.length : 1) }
            },
            message: msg,
            source: 'uros-rml'
        };
        this.diagnostics.push(diagnostic);
    }

    public getDiagnostics(): Diagnostic[] {
        return this.diagnostics;
    }
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    const diagnostics: Diagnostic[] = [];
    const errorListener = new UrosRMLErrorListener(textDocument.uri);

    try {
        const inputStream = new antlr4.InputStream(textDocument.getText());
        const lexer = new UrosRMLLexer(inputStream);
        const tokenStream = new antlr4.CommonTokenStream(lexer);
        const parser = new UrosRMLParser(tokenStream);

        // 移除默认的错误监听器并添加自定义的
        parser.removeErrorListeners();
        parser.addErrorListener(errorListener);

        parser.file(); // 运行解析器

    } catch (e: unknown) { // 显式地将捕获的错误类型设置为 unknown
        // 在 TypeScript 中，catch 块的错误对象 e 默认是 unknown 类型
        // 必须进行类型检查才能访问其属性
        if (e instanceof Error) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 1 }
                },
                message: `Parsing error: ${e.message}`,
                source: 'uros-rml'
            });
        }
    }

    // 将捕获的诊断信息与解析器生成的诊断信息合并
    const finalDiagnostics = diagnostics.concat(errorListener.getDiagnostics());

    // 发送诊断信息到VS Code
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: finalDiagnostics });
}

// 监听文档打开、关闭事件
documents.listen(connection);

// 启动连接
connection.listen();