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
	"Emit this try/except/else/finally.

	Handlers compile to NESTED protected blocks:

		[[ body ] on: T1 do: [H1] ] on: T2 do: [H2]

	so H1's BODY runs inside H2's protected block.  Without the SHIELD below, an
	exception raised by the first handler was caught by the second -- but Python's
	except clauses are alternatives for the try BODY only, and a raise inside a
	handler leaves the whole statement.  Every handler but the last was exposed to
	every handler after it.

	The shield is a DEPTH.  Each handler body brackets itself with
	BaseException ___enterHandler___ / ___exitHandler___ (through the ensure: that
	already restores sys.exc_info()), and the selectors of handlers 2..N record
	the depth at which they were INSTALLED and handle nothing once the depth has
	risen above it.  Nesting therefore works: a try inside a handler installs its
	selectors at the raised depth, so its own handlers still catch from its own
	body while this try's later handlers stay shielded.

	Two other designs were built and measured first, and both are worse.  Moving
	the handler bodies outside the on:do: (recording which matched, dispatching
	afterwards) is semantically exact and makes a bare ``raise'' impossible --
	GemStone will not signal an exception whose handler has unwound
	(UncontinuableError 6011), which test_listcomps' test_comp_in_try_except
	catches.  A per-statement flag in a block enclosing the whole try works, and
	costs a stack frame per try: test_richcmp's test_recursion became a
	RecursionError.  An integer captured in the selector costs neither.

	THE ELSE CLAUSE sits OUTSIDE the handler nest and INSIDE the ensure, which is
	the whole reason Python has one: ``else'' is the code that must NOT be
	protected by this statement's own ``except'' clauses.  Emitting it as a tail
	of the try body -- which is what this did -- made every handler catch its own
	else, so

	    try:    x = d[k]
	    except KeyError: handle_missing()
	    else:   use(x)

	reported a KeyError raised by ``use'' as a missing key.  CPython's
	test_exception_variations test_nested_exception_in_else is the case that
	names it.  ``finally'' still covers the else, so the else cannot move outside
	the ensure as well -- it belongs between the two.

	Whether the body fell through is carried as the VALUE of the handler nest:
	the body block ends in ``true'', every handler in ``false'', and ``on:do:''
	answers whichever one ran.  That is deliberately NOT the enclosing-block flag
	rejected above -- it reuses a frame that already exists, so try/except/else
	costs no stack depth that try/except did not."

	| useEnsureFinally emitElseOutside useTryToken |
	"``else'' without ``except'' is a SyntaxError in Python, so the guarded form
	is the only one that occurs.  Keep the inline emit for the impossible case
	rather than dropping the clause on the floor."
	emitElseOutside := orelse size > 0 and: [handlers notEmpty].
	"PEP 654 ``except*'' gets a WHOLLY SEPARATE emit.  The nested-on:do:
	shape below encodes ``first matching clause wins, the rest are
	alternatives''; except* means the opposite -- the raised group is
	SPLIT and every clause runs against its own share -- so there is
	nothing to thread through that shape."
	(handlers notEmpty and: [(handlers at: 1) isStar]) ifTrue: [
		^ self printExceptStarOn: aStream
	].
	"finally-during-propagation: route the finally through
	BaseException>>___ensureFinally___:finally: (instead of a bare ensure:) so
	sys.exc_info() inside the finally sees a propagating exception -- but ONLY in
	a non-generator scope (the helper's ``ex pass'' re-raise is generator-unsafe;
	a generator try/finally keeps the plain ensure:).  Module-level try/finally
	(functionBeingCompiled nil) is never a generator, so it uses the helper too."
	useEnsureFinally := finalbody size > 0.
	"A TRY WITH TWO OR MORE CLAUSES needs a per-ACTIVATION token, shared by its
	clauses, so a later clause can tell ``my own earlier handler raised this''
	from ``something my body called raised it while handling its own
	exception''.  One clause has no sibling to shield, so it emits exactly what
	it always did."
	useTryToken := handlers size > 1.

	"Open ensure wrapper for finally"
	finalbody size > 0 ifTrue: [
		useEnsureFinally ifTrue: [
			aStream nextPutAll: 'BaseException @env0:___ensureFinally___: '].
		aStream nextPut: $[.
	].

	"Open blocks for each handler.  With an else clause the whole nest is also
	parenthesised, because its value is what decides whether the else runs."
	emitElseOutside ifTrue: [aStream nextPut: $(].
	handlers do: [:each |
		aStream nextPut: $[.
	].

	"Indent body if we have handlers or finally"
	(handlers notEmpty or: [finalbody size > 0]) ifTrue: [
		aStream increaseIndent; lf.
	].

	"Print try body"
	body printSmalltalkOn: aStream.

	"Close the body block with ``true'' -- the value that says the body fell
	through, and so that the else is due.  Emitted only when there is an else to
	decide about, so an ordinary try/except is byte-for-byte what it was."
	emitElseOutside
		ifTrue: [aStream nextPutAll: 'true'; lf]
		ifFalse: [
			"No handlers to escape (``else'' without ``except'' -- not reachable
			from Python source), so the old inline emit is still correct."
			orelse size > 0 ifTrue: [orelse printSmalltalkOn: aStream]].

	"Close each handler"
	1 to: handlers size do: [:index |
		| handler |
		handler := handlers at: index.
		aStream decreaseIndent.
		index = 1
			ifTrue: [aStream nextPutAll: '] @env0:on: ']
			ifFalse: [aStream nextPutAll: ']] @env0:on: '].
		handler type
			ifNil: [
				"A bare ``except:''.  After the first handler it still needs a shield,
				and the shield lives on PyLazyExceptSelector, so the class has to be
				wrapped rather than emitted directly."
				index = 1
					ifTrue: [aStream nextPutAll: 'BaseException']
					ifFalse: [
						aStream nextPutAll: '(PyLazyExceptSelector @env0:on: [BaseException] shieldedFor: ', self ___trySiteTokenLiteral___, ')']]
			ifNotNil: [
				"Validate the handler through BaseException ___pyExceptType___:
				before ``on:do:'' sends it #handles:.  Catching a non-exception
				(a str, an instance, a class not derived from BaseException) must
				raise ``TypeError: catching classes that do not inherit from
				BaseException is not allowed'', not MNU on #handles:
				(test_baseexception test_catch_*).  The handler is passed as an
				ARGUMENT so it cannot MNU during the check.

				Both the expression AND that validation go inside a block, held
				by a PyLazyExceptSelector: ``on:do:'' evaluates its on: argument
				when the handler is INSTALLED, but Python evaluates an
				``except <expr>:'' clause only when an exception actually
				reaches it.  Evaluating eagerly made
				  try: ... / except json.decoder.JSONDecodeError: ...
				fail on the success path when the name did not resolve."
				aStream nextPutAll: '(PyLazyExceptSelector @env0:on: [BaseException @env1:___pyExceptType___: '.
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
				index = 1
					ifTrue: [aStream nextPutAll: '])']
					ifFalse: [
						"Records the depth as it is INSTALLED, which is what makes the
						shield exact under nesting."
						aStream nextPutAll: '] shieldedFor: ', self ___trySiteTokenLiteral___, ')']].
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
				nextPutAll: '(BaseException @env0:___payloadOf___: ___ex) @env0:___pushCatchingFrame___: (PyCode @env0:name: ''';
				nextPutAll: ___func name asString;
				nextPutAll: ''' filename: '.
			self emitSourceFilenameLiteralOn: aStream.
			aStream
				nextPutAll: ' firstlineno: ';
				print: ___func beginLine;
				nextPutAll: ') pos: ___curPos___.';
				lf].
		"Record ___ex as this session's currently-handled exception (CPython
		sys.exc_info()), restoring the prior value when the handler exits --
		via ensure: so a return/break/continue or a re-raise still restores.
		Runs AFTER the control-flow guard so a pending signal never becomes
		'the current exception'."
		"``___ex'' may be a CARRIER -- a throwaway exception raised to deliver
		the real one without re-signalling it (BaseException
		___signalCarrying___:).  Everything from here on is Python-visible, so
		it must see the PAYLOAD: sys.exc_info(), the ``as e'' binding and a bare
		``raise'' in the body all read what these two lines record."
		aStream
			nextPutAll: '___savedExc := BaseException @env0:___currentException___. BaseException @env0:___setCurrentException___: (BaseException @env0:___payloadOf___: ___ex). BaseException @env0:___enterHandler___';
			nextPutAll: (useTryToken ifTrue: [': ', self ___trySiteTokenLiteral___] ifFalse: ['']);
			nextPutAll: '. [';
			lf.
		handler name ifNotNil: [
			"Route ``except X as e'' through the module-scope-aware store so
			a module-level e binds the module variable rather than an
			undeclared temp."
			self ___emitModuleScopeStoreOf___: handler name
				from: '(BaseException @env0:___payloadOf___: ___ex)' on: aStream.
			aStream lf.
		].
		handler body printSmalltalkOn: aStream.
		aStream
			lf;
			nextPutAll: '] @env0:ensure: [BaseException @env0:___exitHandler___. BaseException @env0:___setCurrentException___: ___savedExc]'.
		"Answer ``false'' so a handler that RAN can never be mistaken for a body
		that fell through -- otherwise the else would fire off whatever the
		handler's last statement happened to evaluate to."
		emitElseOutside ifTrue: [aStream nextPutAll: '. false'].
		aStream lf.
	].

	"Close final blocks.  With the helper the finally is the second keyword
	argument (``finally:''); without it, a bare ``@env0:ensure:''."
	handlers notEmpty ifTrue: [
		aStream decreaseIndent.
		"Close the last handler's do: block on its own, so the else clause can be
		hung off the nest's value before the ensure is closed.  Without an else
		this is the leading ``]'' of the old ``]]''/``].'' exactly."
		aStream nextPut: $].
		emitElseOutside ifTrue: [
			aStream nextPutAll: ') ifTrue: ['; increaseIndent; lf.
			orelse printSmalltalkOn: aStream.
			aStream decreaseIndent; nextPut: $]].
		finalbody size > 0
			ifTrue: [
				aStream nextPutAll: (useEnsureFinally ifTrue: ['] finally: ['] ifFalse: ['] @env0:ensure: [']);
					increaseIndent; lf.
				finalbody printSmalltalkOn: aStream.
				aStream decreaseIndent; nextPutAll: '].']
			ifFalse: [aStream nextPutAll: '.'].
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
method: TryAst
body
	^body
%
method: TryAst
body: newValue
	body := newValue
%
method: TryAst
handlers
	^handlers
%
method: TryAst
handlers: newValue
	handlers := newValue
%
method: TryAst
orelse
	^orelse
%
method: TryAst
orelse: newValue
	orelse := newValue
%
method: TryAst
finalbody
	^finalbody
%
method: TryAst
finalbody: newValue
	finalbody := newValue
%

category: 'Grail-code generation'
method: TryAst
___trySiteTokenLiteral___
	"A Symbol literal naming THIS try STATEMENT, used to tell a later clause's
	shield that one of its own siblings' handlers is running.

	A SYMBOL, and therefore free: it is a literal baked into the compiled
	method, so it costs no allocation and -- crucially -- no STACK FRAME.  The
	obvious alternative, a fresh object per try ENTRY held in an enclosing
	block's temp, is what makes the token per-ACTIVATION rather than per-site
	and is strictly more correct; it is also a design this file has already
	rejected once, because the extra frame per try turned test_richcmp's
	test_recursion (which runs under support.infinite_recursion(25)) into a
	RecursionError.  The comment on PyLazyExceptSelector class
	>> on:shieldedAbove: records that.

	Built from the SOURCE LOCATION (path + line -- a ``try'' always starts its
	own line) rather than a counter so it is stable across compiles: a session-global counter would restart, and methods compiled in an
	earlier session persist, so two unrelated try statements could end up
	sharing a token and shielding each other.

	WHAT PER-SITE GIVES UP, precisely: a function that recurses FROM INSIDE one
	of its own handlers, where the inner activation's later clause should catch
	something the outer activation's handler is not responsible for.  The token
	is on the stack from the outer activation, so the inner clause shields when
	CPython would catch.  Recursion that does not pass through a handler of the
	same try is unaffected, which is the ordinary case."

	| ws |
	ws := WriteStream on: String new.
	ws nextPutAll: '#''___grailTrySite_'.
	ws nextPutAll: (CallAst sourcePath ifNil: ['<grail>'] ifNotNil: [:p | p asString]).
	ws nextPutAll: '_'.
	ws nextPutAll: self beginLine printString.
	ws nextPutAll: '___'''.
	^ ws contents
%

category: 'Grail-code generation'
method: TryAst
printExceptStarOn: aStream
	"Emit a PEP 654 try/except*.

	    [ body ] on: BaseException do: [:ex |
	        rest := normalize(ex).
	        rest := clause(rest, T1, [:g | n1 := g. body1]).
	        rest := clause(rest, T2, [:g | n2 := g. body2]).
	        finish(rest, ex) ]

	The remainder is THREADED through the clauses rather than each clause
	testing the original: every clause takes its matching subgroup out and
	passes the rest on, which is what makes all of them run instead of
	just the first match.

	finally still wraps the whole thing, so its emit is shared with the
	ordinary path."

	| useEnsureFinally exVar restVar |
	"``___ex'' deliberately, NOT a star-specific name: a bare ``raise'' in a
	handler emits ``___ex pass'', so any other spelling leaves that
	re-raise naming an undefined symbol and the whole method fails to
	compile.  test_traceback's test_exception_group_wrapped_naked is
	exactly ``except* Exception as e: raise''."
	exVar := '___ex'.
	restVar := '___estar_rest___'.
	useEnsureFinally := finalbody size > 0.
	useEnsureFinally ifTrue: [
		aStream nextPutAll: 'BaseException @env0:___ensureFinally___: '; nextPut: $[.
	].
	"``except*'' has the same else rule as ``except'': the else is NOT protected
	by this statement's own clauses.  There is only ONE clause block here
	(handlers are dispatched inside it), so the marker is carried the same way --
	the body block answers ``true'', the clause block ``false''."
	orelse size > 0 ifTrue: [aStream nextPut: $(].
	aStream nextPut: $[; increaseIndent; lf.
	body printSmalltalkOn: aStream.
	orelse size > 0 ifTrue: [aStream nextPutAll: 'true'; lf].
	aStream decreaseIndent.
	aStream nextPutAll: '] @env0:on: BaseException do: [:'; nextPutAll: exVar;
		nextPutAll: ' | | '; nextPutAll: restVar; nextPutAll: ' | '; increaseIndent; lf.
	aStream nextPutAll: restVar;
		nextPutAll: ' := BaseExceptionGroup @env1:___exceptStarNormalize___: ';
		nextPutAll: exVar; nextPutAll: '.'; lf.
	handlers do: [:each |
		aStream nextPutAll: restVar;
			nextPutAll: ' := BaseExceptionGroup @env1:___exceptStarClause___: ';
			nextPutAll: restVar; nextPutAll: ' type: ('.
		each type printSmalltalkOn: aStream.
		aStream nextPutAll: ') do: [:___estar_g___ | '; increaseIndent; lf.
		each name ifNotNil: [:n |
			"The SAME module-scope-aware store the ordinary handler uses.  A
			bare ``n := g'' breaks exactly where every other binding form
			did: a ``global''-declared name has no Smalltalk temp, so the
			assignment names an undefined symbol.  test_global's
			test_caught_exception_group is precisely that case."
			self ___emitModuleScopeStoreOf___: n from: '___estar_g___' on: aStream.
			aStream lf].
		each body printSmalltalkOn: aStream.
		aStream decreaseIndent; nextPutAll: '].'; lf.
	].
	aStream nextPutAll: 'BaseExceptionGroup @env1:___exceptStarFinish___: ';
		nextPutAll: restVar; nextPutAll: ' original: '; nextPutAll: exVar.
	"``___exceptStarFinish___'' re-raises anything unhandled; returning at all
	means a clause ran, so the else is not due."
	orelse size > 0 ifTrue: [aStream nextPutAll: '. false'].
	aStream decreaseIndent; lf; nextPutAll: ']'.
	orelse size > 0 ifTrue: [
		aStream nextPutAll: ') ifTrue: ['; increaseIndent; lf.
		orelse printSmalltalkOn: aStream.
		aStream decreaseIndent; nextPut: $]].
	useEnsureFinally ifTrue: [
		aStream nextPutAll: '] finally: ['; increaseIndent; lf.
		finalbody printSmalltalkOn: aStream.
		aStream decreaseIndent; nextPutAll: '].'; lf
	] ifFalse: [aStream nextPutAll: '.'; lf]
%
