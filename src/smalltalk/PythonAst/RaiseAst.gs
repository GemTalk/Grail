! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for RaiseAst
expectvalue /Class
doit
StatementAst subclass: 'RaiseAst'
  instVarNames: #( exc cause)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
RaiseAst comment:
'https://docs.python.org/3/library/ast.html#ast.Raise

A raise statement.

exc is the exception object to be raised (can be None for a standalone raise).
cause is the optional part for y in raise x from y (can be None).

Example:
>>> print(ast.dump(ast.parse(''raise x from y''), indent=4))
Module(
    body=[
        Raise(
            exc=Name(id=''x'', ctx=Load()),
            cause=Name(id=''y'', ctx=Load()))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        RaiseAst(exc cause)
'
%

expectvalue /Class
doit
RaiseAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from RaiseAst
removeallmethods RaiseAst
removeallclassmethods RaiseAst

set compile_env: 0

category: 'Grail-other'
method: RaiseAst
printSmalltalkOn: aStream

	exc ifNil: [
		aStream nextPutAll: '___ex @env0:pass.'.
	] ifNotNil: [
		(exc isKindOf: CallAst) ifTrue: [
			"raise ExceptionClass(msg) → ExceptionClass ___signal___: msg"
			exc function printSmalltalkWithParenthesisOn: aStream.
			exc arguments notEmpty ifTrue: [
				aStream nextPutAll: ' ___signal___: '.
				exc arguments first printSmalltalkWithParenthesisOn: aStream.
				aStream nextPut: $..
			] ifFalse: [
				aStream nextPutAll: ' @env0:signal.'.
			].
		] ifFalse: [
			"raise expr → expr @env0:signal"
			exc printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: ' @env0:signal.'.
		].
	].
%
