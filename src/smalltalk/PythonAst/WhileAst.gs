! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for WhileAst
expectvalue /Class
doit
StatementAst subclass: 'WhileAst'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
WhileAst comment:
'https://docs.python.org/3/library/ast.html#ast.While

A while loop.

test holds the condition.
body is a list of nodes.
orelse is a list of nodes for the else clause.

Example:
>>> print(ast.dump(ast.parse(''while x:\\n    ...\\nelse:\\n    ...''), indent=4))
Module(
    body=[
        While(
            test=Name(id=''x'', ctx=Load()),
            body=[Expr(value=Constant(value=Ellipsis))],
            orelse=[Expr(value=Constant(value=Ellipsis))])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        WhileAst(test body orelse)
'
%

expectvalue /Class
doit
WhileAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from WhileAst
removeallmethods WhileAst
removeallclassmethods WhileAst

set compile_env: 0

category: 'Grail-other'
method: WhileAst
printSmalltalkOn: aStream

	aStream nextPut: $[.
	test printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ___isTruthy___] whileTrue: ['; increaseIndent; lf.
	body printSmalltalkOn: aStream.
	aStream decreaseIndent; nextPutAll: '].'.
	(orelse notNil and: [orelse size > 0]) ifTrue: [
		aStream lf.
		orelse do: [:stmt |
			stmt printSmalltalkOn: aStream.
			aStream lf.
		].
	].
%
