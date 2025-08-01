grammar UrosRML;

@header {
package com.uros;
}

// ----------------------------------------------------
// Parser Rules (句法规则)
// ----------------------------------------------------

// 顶层规则：一个 UrosRML 文件现在可以直接包含一个或多个 interface 或 thing 的定义
file: (interface | thing)+ EOF;

// 接口定义
interface: INTERFACE ID (implementsInterfaces)? '{' (interfaceBody)? '}';
implementsInterfaces: IMPLEMENTS ID (COMMA ID)*;
interfaceBody: (commandsSection | eventsSection)+;
commandsSection: COMMANDS '{' command+ '}';
eventsSection: EVENTS '{' event+ '}';

// 命令和事件定义
command: ID '(' (paramList)? ')' SEMI;
event: ID '(' (paramList)? ')' SEMI;
paramList: param (COMMA param)*;
param: ID ':' dataType;

// 设备（Thing）定义
thing: THING ID (implementsInterfaces)? '{' thingBody? '}';
thingBody: (propertiesSection | behaviorSection | interfaceBody)*;
propertiesSection: PROPERTIES '{' property+ '}';
property: ID ':' dataType (EQUAL value)? SEMI;

// 行为（Behavior）定义
behaviorSection: BEHAVIOR '{' statechart '}';
statechart: state+;
state: STATE ID '{' (onRule)* (gotoRule)? '}';

// 行为规则（on command/event）
onRule: ON (COMMAND | EVENT) ID '(' (paramList)? ')' (IF '(' condition ')')? '{' actionBlock '}';

// 状态切换（goto）
gotoRule: GOTO ID SEMI;

// 动作块，包含一系列动作
actionBlock: action (action)*;

// 单个动作
action: sendAction | assignAction | gotoAction | ifAction;

// 具体的动作类型
sendAction: SEND (EVENTS | COMMANDS) '.' ID '(' (expressionList)? ')' SEMI;
assignAction: ID EQUAL expression SEMI;
gotoAction: GOTO ID SEMI;
ifAction: IF '(' expression ')' '{' actionBlock '}' (ELSE '{' actionBlock '}')?;

// 表达式和条件
expressionList: expression (COMMA expression)*;
expression: value | ID | expression op expression | ID '.' ID; // 简化表达式
op: EQUAL | NOT_EQUAL | GREATER | LESS | GREATER_EQUAL | LESS_EQUAL;
condition: expression; // 简化为表达式

// 值和数据类型
dataType: BOOLEAN | UINT8 | INT32 | STRING;
value: BOOLEAN_LITERAL | UINT8_LITERAL | INT32_LITERAL | STRING_LITERAL | ID;

// ----------------------------------------------------
// Lexer Rules (词法规则)
// ----------------------------------------------------

// 关键字
THING: 'thing';
INTERFACE: 'interface';
IMPLEMENTS: 'implements';
PROPERTIES: 'properties';
BEHAVIOR: 'behavior';
STATE: 'state';
ON: 'on';
COMMAND: 'command';
EVENT: 'event';
IF: 'if';
ELSE: 'else';
GOTO: 'goto';
SEND: 'send';
COMMANDS: 'commands';
EVENTS: 'events';

// 数据类型关键字
BOOLEAN: 'boolean';
UINT8: 'UInt8';
INT32: 'Int32';
STRING: 'String';

// 字面量
BOOLEAN_LITERAL: 'true' | 'false';
UINT8_LITERAL: [0-9]+;
INT32_LITERAL: ('-'? [0-9]+);
STRING_LITERAL: '"' (~["\r\n\\])* '"';

// 运算符和标点符号
LPAREN: '(';
RPAREN: ')';
LBRACE: '{';
RBRACE: '}';
SEMI: ';';
COLON: ':';
COMMA: ',';
EQUAL: '=';
NOT_EQUAL: '!=';
GREATER: '>';
LESS: '<';
GREATER_EQUAL: '>=';
LESS_EQUAL: '<=';
DOT: '.';

// 标识符
ID: [a-zA-Z_] [a-zA-Z_0-9]*;

// 注释
LINE_COMMENT: '//' ~[\r\n]* -> skip;
BLOCK_COMMENT: '/*' .*? '*/' -> skip;

// 空白符
WS: [ \t\r\n]+ -> skip;