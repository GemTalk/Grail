! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReturnAst
expectvalue /Class
doit
StatementAst subclass: 'ReturnAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ReturnAst comment:
'https://docs.python.org/3/library/ast.html#ast.Return

A return statement.

value is what is returned (can be None).

Example:
>>> print(ast.dump(ast.parse(''return x''), indent=4))
Module(
    body=[
        Return(value=Name(id=''x'', ctx=Load()))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        ReturnAst(value)
'
%

expectvalue /Class
doit
ReturnAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ReturnAst
removeallmethods ReturnAst
removeallclassmethods ReturnAst

set compile_env: 0

category: 'Grail-other'
method: ReturnAst
printSmalltalkOn: aStream

	aStream nextPutAll: 'PythonReturn ___signal___: '.
	value ifNil: [
		aStream nextPutAll: 'None'.
	] ifNotNil: [
		value printSmalltalkWithParenthesisOn: aStream.
	].
	aStream nextPut: $.
%
