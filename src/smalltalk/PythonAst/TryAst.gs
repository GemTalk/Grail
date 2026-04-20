! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for TryAst
expectvalue /Class
doit
StatementAst subclass: 'TryAst'
  instVarNames: #( body handlers orelse
                    finalbody)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
TryAst comment:
'https://docs.python.org/3/library/ast.html#ast.Try

A try statement.

body is a list of nodes.
handlers is a list of ExceptHandler nodes.
orelse is a list of nodes for the else clause.
finalbody is a list of nodes for the finally clause.

Example:
>>> print(ast.dump(ast.parse(''try:\\n    ...\\nexcept Exception:\\n    ...\\nelse:\\n    ...\\nfinally:\\n    ...''), indent=4))
Module(
    body=[
        Try(
            body=[Expr(value=Constant(value=Ellipsis))],
            handlers=[ExceptHandler(type=Name(id=''Exception'', ctx=Load()), body=[...])],
            orelse=[...],
            finalbody=[...])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        TryAst(body handlers orelse finalbody)
'
%

expectvalue /Class
doit
TryAst category: 'Parser'
%

! ------------------- Remove existing behavior from TryAst
removeallmethods TryAst
removeallclassmethods TryAst

set compile_env: 0

category: 'other'
method: TryAst
printSmalltalkOn: aStream

	"Open ensure wrapper for finally"
	finalbody size > 0 ifTrue: [
		aStream nextPut: $[.
	].

	"Open blocks for each handler"
	handlers do: [:each |
		aStream nextPut: $[.
	].

	"Indent body if we have handlers or finally"
	(handlers notEmpty or: [finalbody size > 0]) ifTrue: [
		aStream increaseIndent; lf.
	].

	"Print try body"
	body printSmalltalkOn: aStream.

	"Print else body (inside try block, runs only if no exception)"
	orelse size > 0 ifTrue: [
		orelse printSmalltalkOn: aStream.
	].

	"Close each handler"
	1 to: handlers size do: [:index |
		| handler |
		handler := handlers at: index.
		aStream decreaseIndent.
		index = 1
			ifTrue: [aStream nextPutAll: '] @env0:on: ']
			ifFalse: [aStream nextPutAll: ']] @env0:on: '].
		handler type
			ifNil: [aStream nextPutAll: 'BaseException']
			ifNotNil: [handler type printSmalltalkOn: aStream].
		aStream nextPutAll: ' do: [:___ex |'; increaseIndent; lf.
		handler name ifNotNil: [
			aStream nextPutAll: handler name; nextPutAll: ' := ___ex.'; lf.
		].
		handler body printSmalltalkOn: aStream.
	].

	"Close final blocks"
	handlers notEmpty ifTrue: [
		aStream decreaseIndent.
		finalbody size > 0
			ifTrue: [
				aStream nextPutAll: ']] @env0:ensure: ['; increaseIndent; lf.
				finalbody printSmalltalkOn: aStream.
				aStream decreaseIndent; nextPutAll: '].']
			ifFalse: [aStream nextPutAll: '].'].
	] ifFalse: [
		finalbody size > 0 ifTrue: [
			aStream decreaseIndent; nextPutAll: '] @env0:ensure: ['; increaseIndent; lf.
			finalbody printSmalltalkOn: aStream.
			aStream decreaseIndent; nextPutAll: '].'.
		].
	].
%
