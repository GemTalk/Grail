! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AssertAst
expectvalue /Class
doit
StatementAst subclass: 'AssertAst'
  instVarNames: #( test msg)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AssertAst comment:
'https://docs.python.org/3/library/ast.html#ast.Assert

An assertion.

test holds the condition, such as a Compare node.
msg holds the failure message (can be None).

Example:
>>> print(ast.dump(ast.parse(''assert x, "error"''), indent=4))
Module(
    body=[
        Assert(
            test=Name(id=''x'', ctx=Load()),
            msg=Constant(value=''error''))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        AssertAst(test msg)
'
%

expectvalue /Class
doit
AssertAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AssertAst
removeallmethods AssertAst
removeallclassmethods AssertAst

set compile_env: 0

category: 'Grail-other'
method: AssertAst
printSmalltalkOn: aStream

	test printSmalltalkWithParenthesisOn: aStream.
	msg ifNil: [
		aStream nextPutAll: ' ifFalse: [AssertionError perform: #signal env: 0].'.
	] ifNotNil: [
		aStream nextPutAll: ' ifFalse: [AssertionError perform: #''signal:'' env: 0 withArguments: {'.
		msg printSmalltalkOn: aStream.
		aStream nextPutAll: '}].'.
	].
%
