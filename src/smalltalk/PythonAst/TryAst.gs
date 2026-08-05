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

	| useEnsureFinally |
	"finally-during-propagation: route the finally through
	BaseException>>___ensureFinally___:finally: (instead of a bare ensure:) so
	sys.exc_info() inside the finally sees a propagating exception -- but ONLY in
	a non-generator scope (the helper's ``ex pass'' re-raise is generator-unsafe;
	a generator try/finally keeps the plain ensure:).  Module-level try/finally
	(functionBeingCompiled nil) is never a generator, so it uses the helper too."
	useEnsureFinally := finalbody size > 0 and: [
		CallAst functionBeingCompiled isNil
			or: [CallAst functionBeingCompiled isGenerator not]].

	"Open ensure wrapper for finally"
	finalbody size > 0 ifTrue: [
		useEnsureFinally ifTrue: [
			aStream nextPutAll: 'BaseException @env0:___ensureFinally___: '].
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
				"Validate the handler through BaseException ___pyExceptType___:
				before ``on:do:'' sends it #handles:.  Catching a non-exception
				(a str, an instance, a class not derived from BaseException) must
				raise ``TypeError: catching classes that do not inherit from
				BaseException is not allowed'', not MNU on #handles:
				(test_baseexception test_catch_*).  The handler is passed as an
				ARGUMENT so it cannot MNU during the check."
				aStream nextPutAll: '(BaseException @env1:___pyExceptType___: '.
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
						handler type printSmalltalkWithParenthesisOn: aStream].
				aStream nextPut: $)].
		aStream nextPutAll: ' do: [:___ex | | ___savedExc |'; increaseIndent; lf.
		"Always re-raise Grail's control-flow signals so a Python
		``except Exception`` doesn't swallow a pending ``return`` /
		``break`` / ``continue``.  Without this guard, jinja2's
		``try: ... except Exception: handle_exception()`` traps the
		PythonReturn that carries the render result and dispatches
		into the handler with a BoundMethod-shaped ``___ex``."
		aStream
			nextPutAll: '((___ex isKindOf: PythonReturn) or: [(___ex isKindOf: PythonBreak) or: [___ex isKindOf: PythonContinue]]) ifTrue: [___ex @env0:pass].';
			lf.
		"Traceback: give the exception a frame for the function catching it, at
		___curPos___ (the try-body statement it propagated from) -- but only as a
		FALLBACK (___pushCatchingFrame___ no-ops if a deeper frame already
		exists), so a plain wrapper-less module-level def/method still yields a
		non-empty traceback.  Only inside a function (module-level try has no
		___curPos___)."
		CallAst functionBeingCompiled ifNotNil: [:___func |
			aStream
				nextPutAll: '___ex @env0:___pushCatchingFrame___: (PyCode @env0:name: ''';
				nextPutAll: ___func name asString;
				nextPutAll: ''' firstlineno: ';
				print: ___func beginLine;
				nextPutAll: ') pos: ___curPos___.';
				lf].
		"Record ___ex as this session's currently-handled exception (CPython
		sys.exc_info()), restoring the prior value when the handler exits --
		via ensure: so a return/break/continue or a re-raise still restores.
		Runs AFTER the control-flow guard so a pending signal never becomes
		'the current exception'."
		aStream
			nextPutAll: '___savedExc := BaseException @env0:___currentException___. BaseException @env0:___setCurrentException___: ___ex. [';
			lf.
		handler name ifNotNil: [
			"Route ``except X as e'' through the module-scope-aware store so
			a module-level e binds the module variable rather than an
			undeclared temp."
			self ___emitModuleScopeStoreOf___: handler name from: '___ex' on: aStream.
			aStream lf.
		].
		handler body printSmalltalkOn: aStream.
		aStream
			lf;
			nextPutAll: '] @env0:ensure: [BaseException @env0:___setCurrentException___: ___savedExc]';
			lf.
	].

	"Close final blocks.  With the helper the finally is the second keyword
	argument (``finally:''); without it, a bare ``@env0:ensure:''."
	handlers notEmpty ifTrue: [
		aStream decreaseIndent.
		finalbody size > 0
			ifTrue: [
				aStream nextPutAll: (useEnsureFinally ifTrue: [']] finally: ['] ifFalse: [']] @env0:ensure: [']);
					increaseIndent; lf.
				finalbody printSmalltalkOn: aStream.
				aStream decreaseIndent; nextPutAll: '].']
			ifFalse: [aStream nextPutAll: '].'].
	] ifFalse: [
		finalbody size > 0 ifTrue: [
			aStream decreaseIndent;
				nextPutAll: (useEnsureFinally ifTrue: ['] finally: ['] ifFalse: ['] @env0:ensure: [']);
				increaseIndent; lf.
			finalbody printSmalltalkOn: aStream.
			aStream decreaseIndent; nextPutAll: '].'.
		].
	].
%
