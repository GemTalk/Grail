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
		self ___emitPushCatchingFrameOn___: aStream.
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
___emitPushCatchingFrameOn___: aStream
	"Give the caught exception a frame for the function catching it, at
	___curPos___ (the try-body statement it propagated from) -- but only as a
	FALLBACK (___pushCatchingFrame___ no-ops if a deeper frame already exists),
	so a plain wrapper-less module-level def/method still yields a non-empty
	traceback.  At module scope the frame is CPython's ``<module>''; before the
	body had a ___curPos___ temp there was no store to read and this was skipped
	entirely, which is why an exception caught at module scope had no traceback
	at all.

	BOTH except emits owe this, and the star one did not do it.  The omission
	is invisible until the group PROPAGATES: an ``except*'' that re-raises
	hands its sub-exceptions on with __traceback__ still None, so
	test_traceback's test_exception_group_wrapped_naked printed a bare
	``Exception: 42'' where CPython prints it under its own traceback."

	| frameName firstLine |
	CallAst functionBeingCompiled
		ifNil: [
			"Module scope.  CPython names this frame ``<module>'' and starts its
			first line at 1; the body declares a ___curPos___ of its own now, so
			the store this reads is there to read."
			CallAst moduleBodyBeingCompiled ifFalse: [^ self].
			frameName := '<module>'.
			firstLine := 1]
		ifNotNil: [:___func |
			frameName := ___func name asString.
			firstLine := ___func beginLine].
	aStream
		nextPutAll: '(BaseException @env0:___payloadOf___: ___ex) @env0:___pushCatchingFrame___: (PyCode @env0:name: ''';
		nextPutAll: frameName;
		nextPutAll: ''' filename: '.
	self emitSourceFilenameLiteralOn: aStream.
	aStream
		nextPutAll: ' firstlineno: ';
		print: firstLine;
		nextPutAll: ') pos: ___curPos___.';
		lf.
%

category: 'Grail-code generation'
method: TryAst
___exceptStarClauseSpanLiteralFor___: aHandler
	"A literal PEP 657 position array covering a whole ``except*'' clause -- the
	keyword through the last character of its body -- which is what CPython
	blames for a re-raise out of that clause.

	The extent is read from the SOURCE TEXT rather than from the AST, because
	neither node that looks like it should know it does.  The handler's own
	endPosition is wherever the clause is followed by, which is the next line
	for a def at column 0 and the next STATEMENT for anything indented; and its
	last statement's is no better -- a bare ``raise'' answers one character past
	its START, so the span stopped six columns short and drew carets CPython
	does not draw.  Where an indented block ends is a fact about the text, and
	scanning for it is both shorter and right: the clause runs to the last
	non-blank line indented past the keyword."

	| spanLine spanCol spanEndLine src ws lineCount probe text |
	spanLine := aHandler beginLine.
	spanCol := aHandler column.
	src := aHandler sourceString.
	lineCount := (src occurrencesOf: Character lf) + 1.
	spanEndLine := spanLine.
	probe := spanLine + 1.
	[probe <= lineCount
		and: [text := self ___sourceLineAt___: probe in: src.
			text trimSeparators isEmpty
				or: [(self ___indentOf___: text) > spanCol]]] whileTrue: [
		text trimSeparators isEmpty ifFalse: [spanEndLine := probe].
		probe := probe + 1].
	ws := WriteStream on: String new.
	ws nextPutAll: '#('; print: spanLine; space; print: spanCol; space;
		print: spanEndLine; space;
		print: (self ___rstrippedSizeOf___:
			(self ___sourceLineAt___: spanEndLine in: src)); space.
	text := [aHandler sourceLine] on: Error do: [:ex | nil].
	text isNil
		ifTrue: [ws nextPutAll: 'nil']
		ifFalse: [
			ws nextPut: $'.
			text do: [:c | c == $' ifTrue: [ws nextPut: $']. ws nextPut: c].
			ws nextPut: $'].
	ws nextPut: $).
	^ ws contents
%

category: 'Grail-code generation'
method: TryAst
___indentOf___: aLine
	"Leading whitespace of aLine, in characters."

	| i |
	i := 1.
	[i <= aLine size and: [(aLine at: i) isSeparator]] whileTrue: [i := i + 1].
	^ i - 1
%

category: 'Grail-code generation'
method: TryAst
___rstrippedSizeOf___: aLine
	"aLine's length with trailing whitespace discounted -- the end column of the
	code on it, which is what a PEP 657 span wants."

	| i |
	i := aLine size.
	[i > 0 and: [(aLine at: i) isSeparator]] whileTrue: [i := i - 1].
	^ i
%

category: 'Grail-code generation'
method: TryAst
___sourceLineAt___: aLineNumber in: aString
	"Line aLineNumber of aString, 1-based, without its terminator -- the same
	walk AbstractLocationNode>>sourceLine does, over a line this node does not
	itself begin on."

	| i j lf |
	lf := Character lf.
	i := 0.
	aLineNumber - 1 timesRepeat: [i := aString indexOf: lf startingAt: i + 1].
	j := aString indexOf: lf startingAt: i + 1.
	j == 0 ifTrue: [j := aString size + 1].
	^ aString copyFrom: i + 1 to: j - 1
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

	| useEnsureFinally exVar restVar normVar rrVar |
	"``___ex'' deliberately, NOT a star-specific name: a bare ``raise'' inside
	a handler names the ___ex of the textually enclosing one, so any other
	spelling leaves that re-raise pointing at an undefined symbol and the
	whole method fails to compile."
	exVar := '___ex'.
	restVar := '___estar_rest___'.
	"The normalized group is kept SEPARATELY from the remainder because the
	remainder is consumed clause by clause: once a clause has re-raised, the
	merge needs the whole group back to project onto.  ___estar_rr___ collects
	those re-raised subgroups -- see ___exceptStarClause___:type:reraised:do:."
	normVar := '___estar_norm___'.
	rrVar := '___estar_rr___'.
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
		nextPutAll: ' | | '; nextPutAll: restVar; nextPut: $ ; nextPutAll: normVar;
		nextPut: $ ; nextPutAll: rrVar; nextPutAll: ' | '; increaseIndent; lf.
	self ___emitPushCatchingFrameOn___: aStream.
	aStream nextPutAll: normVar;
		nextPutAll: ' := BaseExceptionGroup @env1:___exceptStarNormalize___: ';
		nextPutAll: exVar; nextPutAll: '.'; lf.
	aStream nextPutAll: restVar; nextPutAll: ' := '; nextPutAll: normVar;
		nextPutAll: '. '; nextPutAll: rrVar;
		nextPutAll: ' := OrderedCollection @env0:new.'; lf.
	handlers do: [:each |
		aStream nextPutAll: restVar;
			nextPutAll: ' := BaseExceptionGroup @env1:___exceptStarClause___: ';
			nextPutAll: restVar; nextPutAll: ' type: ('.
		each type printSmalltalkOn: aStream.
		aStream nextPutAll: ') reraised: '; nextPutAll: rrVar;
			nextPutAll: ' do: [:___estar_g___ | '; increaseIndent; lf.
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
	"TWO calls, one for each way the statement can end, so that a ___curPos___
	store can sit BETWEEN them.  CPython blames different source for the two:
	an unhandled remainder is blamed on the try body the exception came from,
	which is where ___curPos___ already points, while a re-raise is blamed on
	the whole ``except*'' CLAUSE -- keyword through the end of its body, which
	is why test_exception_group_wrapped_naked expects two source lines under
	one frame.  Grail recovers a frame's position by scanning the emitted text
	backwards from the ip, so the store has to be textually between the call
	that must not see it and the call that must.

	Only with exactly ONE handler.  CPython's position is the clause that
	actually re-raised, which is a runtime fact, and a single store in the
	emitted text cannot name a different clause per run; with several the
	position stays what it was rather than being confidently wrong."
	aStream nextPutAll: 'BaseExceptionGroup @env1:___exceptStarFinish___: ';
		nextPutAll: restVar; nextPutAll: ' original: '; nextPutAll: exVar;
		nextPutAll: ' reraised: '; nextPutAll: rrVar; nextPutAll: '.'; lf.
	(CallAst functionBeingCompiled notNil and: [handlers size = 1]) ifTrue: [
		| lit |
		lit := [self ___exceptStarClauseSpanLiteralFor___: (handlers at: 1)]
			on: Error do: [:ex | ex return: nil].
		lit ifNotNil: [
			aStream nextPutAll: '___curPos___ := '; nextPutAll: lit;
				nextPutAll: '.'; lf]].
	aStream nextPutAll: 'BaseExceptionGroup @env1:___exceptStarFinishReraised___: ';
		nextPutAll: restVar; nextPutAll: ' original: '; nextPutAll: exVar;
		nextPutAll: ' reraised: '; nextPutAll: rrVar;
		nextPutAll: ' normalized: '; nextPutAll: normVar.
	"Either finish re-raises anything still in flight; returning at all means a
	clause ran, so the else is not due."
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

category: 'Grail-IR Codegen'
method: TryAst
___irSoleHandler___
	"The single except handler when this try has exactly one, non-star, with no
	else -- else nil.  (finally is allowed; the emit wraps the nest in
	___ensureFinally___:finally:.)"

	handlers size == 1 ifFalse: [^ nil].
	(orelse isNil or: [orelse size = 0]) ifFalse: [^ nil].
	(handlers at: 1) isStar == true ifTrue: [^ nil].
	^ handlers at: 1
%

category: 'Grail-IR Codegen'
method: TryAst
___irHasFinally___
	^ finalbody notNil and: [finalbody size > 0]
%

category: 'Grail-IR Codegen'
method: TryAst
___irEligibleStatementLocals___: localNames
	"try with at most one except clause (typed or bare, optionally ``as name''
	binding a local), no else, optionally a finally.  ``except (A, B)'' tuples
	(the ExceptionSet join) and multi-clause shields stay on text.  A bare
	try/finally (no except) qualifies too."

	| h |
	(orelse isNil or: [orelse size = 0]) ifFalse: [^ false].
	handlers isEmpty
		ifTrue: [
			"try/finally with no except: only meaningful with a finally."
			self ___irHasFinally___ ifFalse: [^ false]]
		ifFalse: [
			h := self ___irSoleHandler___.
			h isNil ifTrue: [^ false].
			h type ifNotNil: [:t |
				(t isKindOf: TupleAst) ifTrue: [^ false].
				(t ___irEligibleValueLocals___: localNames) ifFalse: [^ false]].
			h name ifNotNil: [:n |
				(localNames includes: n asString) ifFalse: [^ false]].
			((h body isKindOf: BlockAst) or: [h body isKindOf: SuiteAst])
				ifFalse: [^ false].
			(h body ___irEligibleStatementsWithLocals___: localNames)
				ifFalse: [^ false]].
	self ___irHasFinally___ ifTrue: [
		((finalbody isKindOf: BlockAst) or: [finalbody isKindOf: SuiteAst])
			ifFalse: [^ false].
		(finalbody ___irEligibleStatementsWithLocals___: localNames)
			ifFalse: [^ false]].
	((body isKindOf: BlockAst) or: [body isKindOf: SuiteAst]) ifFalse: [^ false].
	^ body ___irEligibleStatementsWithLocals___: localNames
%

category: 'Grail-IR Codegen'
method: TryAst
___emitIRStatementOn___: aBuilder
	"printSmalltalkOn:'s single-handler shape (no else / finally / shield):

	  [ body ] @env0:on: <sel> do: [:___ex | | ___savedExc |
	    ((___ex isKindOf: PythonReturn) or: [(___ex isKindOf: PythonBreak)
	        or: [___ex isKindOf: PythonContinue]]) ifTrue: [___ex @env0:pass].
	    ___savedExc := BaseException @env0:___currentException___.
	    BaseException @env0:___setCurrentException___:
	        (BaseException @env0:___payloadOf___: ___ex).
	    BaseException @env0:___enterHandler___.
	    [ <name := payload.>  handler body...
	    ] @env0:ensure: [BaseException @env0:___exitHandler___.
	        BaseException @env0:___setCurrentException___: ___savedExc]].

	<sel> is BaseException for a bare ``except:'', else the lazily-evaluated
	validated type: (PyLazyExceptSelector @env0:on: [BaseException
	@env1:___pyExceptType___: (T)]) -- evaluated only when an exception reaches
	the clause, exactly as Python evaluates ``except <expr>:''.

	With a finally clause the whole nest sits inside
	``BaseException @env0:___ensureFinally___: [ ... ] finally: [ final ]'' --
	the helper (not a bare ensure:) so sys.exc_info() inside the finally sees a
	propagating exception, exactly as the text emits for every non-generator
	scope (and a generator def is never IR-eligible)."

	| protectedBlk finallyBlk |
	aBuilder at: self beginPosition.
	self ___irHasFinally___ ifFalse: [
		self ___emitIRProtectedPartOn___: aBuilder.
		^ self].
	protectedBlk := aBuilder inBlockDo: [
		self ___emitIRProtectedPartOn___: aBuilder].
	finallyBlk := aBuilder inBlockDo: [
		finalbody ___emitIRStatementsOn___: aBuilder].
	aBuilder add: (aBuilder
		send: #'___ensureFinally___:finally:'
		to: (aBuilder globalNamed: #BaseException)
		with: { protectedBlk. finallyBlk } env: 0).
	^ self
%

category: 'Grail-IR Codegen'
method: TryAst
___emitIRProtectedPartOn___: aBuilder
	"The statement inside any finally wrapper: the bare body statements when
	there is no except clause, else the [body] on: <sel> do: [handler] nest,
	added in the CURRENT builder context."

	| tryBlk selArg handlerBlk h |
	handlers isEmpty ifTrue: [
		body ___emitIRStatementsOn___: aBuilder.
		^ self].
	h := self ___irSoleHandler___.
	tryBlk := aBuilder inBlockDo: [body ___emitIRStatementsOn___: aBuilder].
	selArg := h type isNil
		ifTrue: [aBuilder globalNamed: #BaseException]
		ifFalse: [
			| typeBlk |
			typeBlk := aBuilder inBlockDo: [
				aBuilder add: (aBuilder
					send: #'___pyExceptType___:'
					to: (aBuilder globalNamed: #BaseException)
					with: { h type ___emitIRValueOn___: aBuilder })].
			aBuilder
				send: #on:
				to: (aBuilder globalNamed: #PyLazyExceptSelector)
				with: { typeBlk } env: 0].
	handlerBlk := aBuilder blockWithArg: #'___ex' temp: #'___savedExc'
		do: [:exLeaf :savedLeaf |
			| guard innerBlk ensureBlk |
			guard := aBuilder
				send: #or:
				to: (aBuilder send: #isKindOf: to: (aBuilder var: exLeaf)
					with: { aBuilder globalNamed: #PythonReturn } env: 0)
				with: { aBuilder inBlockDo: [aBuilder add: (aBuilder
					send: #or:
					to: (aBuilder send: #isKindOf: to: (aBuilder var: exLeaf)
						with: { aBuilder globalNamed: #PythonBreak } env: 0)
					with: { aBuilder inBlockDo: [aBuilder add: (aBuilder
						send: #isKindOf: to: (aBuilder var: exLeaf)
						with: { aBuilder globalNamed: #PythonContinue } env: 0)] }
					env: 0)] }
				env: 0.
			aBuilder if: guard then: [
				aBuilder add: (aBuilder
					send: #pass to: (aBuilder var: exLeaf) with: { } env: 0)].
			"The catch-site frame push -- what BUILDS the exception's whole
			traceback chain from the VM's raise-time stack capture (case 1 of
			___pushCatchingFrame___; without it __traceback__ stays None).  Text
			passes ___curPos___ as pos:, which only REFINES the catcher frame's
			position with the last-executed statement's span; nil makes the
			builder derive every line from the captured ips, which the IR-aware
			line machinery (cut 7) answers natively."
			CallAst functionBeingCompiled ifNotNil: [:func |
				| pyCode |
				pyCode := aBuilder
					send: #'name:filename:firstlineno:'
					to: (aBuilder globalNamed: #PyCode)
					with: { aBuilder obj: func name asString.
						aBuilder obj: (CallAst sourcePath ifNil: ['<grail>']).
						aBuilder obj: func beginLine }
					env: 0.
				aBuilder add: (aBuilder
					send: #'___pushCatchingFrame___:pos:'
					to: (aBuilder
						send: #'___payloadOf___:'
						to: (aBuilder globalNamed: #BaseException)
						with: { aBuilder var: exLeaf } env: 0)
					with: { pyCode. aBuilder nilLit }
					env: 0)].
			aBuilder add: (aBuilder assign: savedLeaf from: (aBuilder
				send: #'___currentException___'
				to: (aBuilder globalNamed: #BaseException) with: { } env: 0)).
			aBuilder add: (aBuilder
				send: #'___setCurrentException___:'
				to: (aBuilder globalNamed: #BaseException)
				with: { aBuilder
					send: #'___payloadOf___:'
					to: (aBuilder globalNamed: #BaseException)
					with: { aBuilder var: exLeaf } env: 0 }
				env: 0).
			aBuilder add: (aBuilder
				send: #'___enterHandler___'
				to: (aBuilder globalNamed: #BaseException) with: { } env: 0).
			innerBlk := aBuilder inBlockDo: [
				h name ifNotNil: [:n |
					aBuilder add: (aBuilder
						assign: (aBuilder leafFor: n asSymbol)
						from: (aBuilder
							send: #'___payloadOf___:'
							to: (aBuilder globalNamed: #BaseException)
							with: { aBuilder var: exLeaf } env: 0))].
				h body ___emitIRStatementsOn___: aBuilder].
			ensureBlk := aBuilder inBlockDo: [
				aBuilder add: (aBuilder
					send: #'___exitHandler___'
					to: (aBuilder globalNamed: #BaseException) with: { } env: 0).
				aBuilder add: (aBuilder
					send: #'___setCurrentException___:'
					to: (aBuilder globalNamed: #BaseException)
					with: { aBuilder var: savedLeaf } env: 0)].
			aBuilder add: (aBuilder
				send: #ensure: to: innerBlk with: { ensureBlk } env: 0)].
	aBuilder add: (aBuilder
		send: #on:do: to: tryBlk with: { selArg. handlerBlk } env: 0).
	^ self
%

category: 'Grail-IR Codegen'
method: TryAst
___irReadLocalNamesInto___: aSet locals: localSet
	"The handler's reads of its ``as'' name are satisfied by the payload store
	that precedes its body, like a for target; everything else is a real read."

	| h sub |
	h := handlers size == 1 ifTrue: [handlers at: 1] ifFalse: [nil].
	body ___irReadLocalNamesInto___: aSet locals: localSet.
	(finalbody notNil and: [finalbody size > 0]) ifTrue: [
		finalbody ___irReadLocalNamesInto___: aSet locals: localSet].
	h ifNil: [^ self].
	h type ifNotNil: [:t | t ___irReadLocalNamesInto___: aSet locals: localSet].
	sub := Set new.
	h body ___irReadLocalNamesInto___: sub locals: localSet.
	h name ifNotNil: [:n | sub remove: n asString ifAbsent: []].
	sub do: [:r | aSet add: r].
	^ self
%

category: 'Grail-IR Codegen'
method: TryAst
___irWriteLocalNamesInto___: aSet locals: localSet
	"Body and handler-body writes are all conditional-nested; the ``as'' name's
	own store is self-contained with its handler body (and contributes no
	binding after the statement)."

	| h sub |
	body ___irWriteLocalNamesInto___: aSet locals: localSet.
	h := handlers size == 1 ifTrue: [handlers at: 1] ifFalse: [nil].
	(finalbody notNil and: [finalbody size > 0]) ifTrue: [
		finalbody ___irWriteLocalNamesInto___: aSet locals: localSet].
	h ifNil: [^ self].
	sub := Set new.
	h body ___irWriteLocalNamesInto___: sub locals: localSet.
	h name ifNotNil: [:n | sub remove: n asString ifAbsent: []].
	sub do: [:w | aSet add: w].
	^ self
%
