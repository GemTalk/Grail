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
TryAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from TryAst
removeallmethods TryAst
removeallclassmethods TryAst

set compile_env: 0

category: 'Grail-other'
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
			ifNotNil: [
				(handler type isKindOf: TupleAst)
					ifTrue: [
						"``except (A, B):`` — emit a GemStone ExceptionSet
						(classes joined with #,) rather than a Python tuple;
						``on:do:`` dispatches ``handles:`` on its argument,
						which a tuple/Array doesn't implement."
						aStream nextPut: $(.
						handler type elts doWithIndex: [:each :i |
							i > 1 ifTrue: [aStream nextPutAll: ' @env0:, '].
							each printSmalltalkWithParenthesisOn: aStream].
						aStream nextPut: $)]
					ifFalse: [
						"Parenthesize — a dotted class expression
						(``except http.client.HTTPException:``) prints as a
						keyword send (``x ___pyAttrLoad___: #...``); unparenthesized
						it merges with the surrounding ``on:...do:`` into one
						mashed selector."
						handler type printSmalltalkWithParenthesisOn: aStream]].
		aStream nextPutAll: ' do: [:___ex |'; increaseIndent; lf.
		"Always re-raise Grail's control-flow signals so a Python
		``except Exception`` doesn't swallow a pending ``return`` /
		``break`` / ``continue``.  Without this guard, jinja2's
		``try: ... except Exception: handle_exception()`` traps the
		PythonReturn that carries the render result and dispatches
		into the handler with a BoundMethod-shaped ``___ex``."
		aStream
			nextPutAll: '((___ex isKindOf: PythonReturn) or: [(___ex isKindOf: PythonBreak) or: [___ex isKindOf: PythonContinue]]) ifTrue: [___ex @env0:pass].';
			lf.
		handler name ifNotNil: [
			"Route ``except X as e'' through the module-scope-aware store so
			a module-level e binds the module variable rather than an
			undeclared temp."
			self ___emitModuleScopeStoreOf___: handler name from: '___ex' on: aStream.
			aStream lf.
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
