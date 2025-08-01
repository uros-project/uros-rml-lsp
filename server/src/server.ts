import {
  createConnection,
  TextDocuments,
  TextDocument,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind
} from 'vscode-languageserver/node';
import { CharStreams, CommonTokenStream } from 'antlr4ts'; // 假设使用 TypeScript ANTLR 运行时
import { UrosRMLLexer } from './generated/src/antlr/UrosRMLLexer';
import { UrosRMLParser } from './generated/src/antlr/UrosRMLParser';

// 创建连接
let connection = createConnection(ProposedFeatures.all);

// 创建文档管理器
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams): InitializeResult => {
  let capabilities = params.capabilities;

  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false
      }
    }
  };
});

// 文档更改处理
documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});

function validateTextDocument(textDocument: TextDocument): void {
  let diagnostics: Diagnostic[] = [];
  let text = textDocument.getText();

  try {
    let charStream = CharStreams.fromString(text);
    let lexer = new UrosRMLLexer(charStream);
    let tokens = new CommonTokenStream(lexer);
    let parser = new UrosRMLParser(tokens);
    parser.file();

    if (parser.numberOfSyntaxErrors > 0) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 }
        },
        message: `${parser.numberOfSyntaxErrors} syntax error(s) detected`,
        source: 'rml'
      });
    }
  } catch (e) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 }
      },
      message: `Parsing error: ${e.message}`,
      source: 'rml'
    });
  }

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

documents.listen(connection);
connection.listen();