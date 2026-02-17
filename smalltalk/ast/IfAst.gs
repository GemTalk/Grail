! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for IfAst
expectvalue /Class
doit
StatementAst subclass: 'IfAst'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
IfAst comment:
'https://docs.python.org/3/library/ast.html#ast.If

An if statement.

test holds the condition.
body is a list of nodes.
orelse is a list of nodes for the else clause.

Example:
>>> print(ast.dump(ast.parse(''if x:\\n    ...\\nelse:\\n    ...''), indent=4))
Module(
    body=[
        If(
            test=Name(id=''x'', ctx=Load()),
            body=[Expr(value=Constant(value=Ellipsis))],
            orelse=[Expr(value=Constant(value=Ellipsis))])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        IfAst(test body orelse)
'
%

expectvalue /Class
doit
IfAst category: 'Parser'
%

! ------------------- Remove existing behavior from IfAst
removeallmethods IfAst
removeallclassmethods IfAst

set compile_env: 0

category: 'other'
method: IfAst
printSmalltalkOn: aStream

	test printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ifTrue: ['; increaseIndent; lf.
	body printSmalltalkOn: aStream.
	aStream decreaseIndent; nextPutAll: '].'.
%
