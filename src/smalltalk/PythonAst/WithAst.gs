! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for WithAst
expectvalue /Class
doit
StatementAst subclass: 'WithAst'
  instVarNames: #( items body type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
WithAst comment:
'AsyncWith(withitem* items, stmt* body, string? type_comment)'
%

expectvalue /Class
doit
WithAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from WithAst
removeallmethods WithAst
removeallclassmethods WithAst

set compile_env: 0

category: 'Grail-other'
method: WithAst
printSmalltalkOn: aStream
	"Codegen for `with E1 as V1, E2 as V2, ...: BODY` — nests context
	managers so each item runs its own __enter__/__exit__ protocol.
	Outer item closes over the inner ones. Equivalent Python:

	    mgr = E
	    val = mgr.__enter__()
	    try:
	        V = val
	        BODY
	    except BaseException as ex:
	        if not mgr.__exit__(type(ex), ex, None):
	            raise
	    else:
	        mgr.__exit__(None, None, None)

	The ``else'' is load-bearing and was for a long time a lie: the clean
	__exit__ was emitted as the last expression INSIDE the try, so a manager
	whose __exit__ raised had it called a second time with its own exception.
	It is now emitted after the handler, guarded by whether the protected block
	answered ``true''.

	Wrapping each item in `[:___cm___ | ...] @env0:value: EXPR` keeps
	EXPR evaluated exactly once and gives __exit__ a stable handle to
	the manager — `mgr` is referenced both in the normal-exit path and
	in the exception handler. Non-local `^return` inside BODY still
	returns from the enclosing method (Smalltalk block ^ is always
	non-local), so generator/return semantics carry through."

	self printItem: 1 onStream: aStream.
	aStream nextPut: $.
%

category: 'Grail-other'
method: WithAst
printItem: anIndex onStream: aStream
	"Emit one context-manager wrapper at items[anIndex]. The innermost
	item (anIndex = items size) runs the actual body; outer items
	recurse into the next inner item."

	| item |
	item := items at: anIndex.
	"Blame THIS context manager's expression, not the statement and not the
	body.  CPython pins a raise from __init__ / __enter__ / __exit__ to the
	manager expression precisely so that ``with A(), B(), C():'' says WHICH one
	failed, and it is the only position that can.  ___curPos___ otherwise still
	holds whatever the enclosing statement left there -- the ``with'' line for
	an __enter__ raise, which looked right by accident, and the BODY's last
	statement for an __init__ or __exit__ raise, which did not."
	self ___emitItemPosOn___: aStream for: item.
	aStream nextPutAll: '([:___cm___ |'.
	aStream increaseIndent; lf.
	aStream nextPutAll: '| ___val___ |'; lf.
	"``async with'' runs the SAME shape over __aenter__/__aexit__, and those are
	coroutines -- so the call has to be DRIVEN, which is what CPython's
	``await mgr.__aenter__()'' means.  ___grailAwait___: passes a non-coroutine
	through unchanged, so the sync path is untouched."
	self ___emitProtocolPreflightOn___: aStream.
	aStream nextPutAll: '___val___ := ('; nextPutAll: self ___enterAwaitPrefix___; nextPutAll: '((___cm___ @env1:___pyAttrLoad___: #'''.
	aStream nextPutAll: self ___enterSelector___.
	aStream nextPutAll: ''') @env1:value: { } value: nil)).'; lf.
	"PARENTHESISED because the protected block's VALUE decides whether the
	clean-exit call below runs -- see the comment on ``true'' at the end of it."
	aStream nextPutAll: '(['.
	aStream increaseIndent; lf.
	item optional_vars ifNotNil: [
		"``with X as TARGET'' is an assignment, and TARGET may be any
		assignment target: a name, an attribute, a subscript, or a nested
		/ starred tuple.  ___emitTargetStore___:from:on: is the shared
		emitter -- a plain name still routes through the module-scope-aware
		store (so a module-level y binds the module variable rather than an
		undeclared temp), and everything else reuses AssignAst's per-element
		store.  This branch used to emit the non-name shapes via the
		target's own printSmalltalkOn:, which is a LOAD emit and so failed
		on every target except a bare name."
		self ___emitTargetStore___: item optional_vars from: '___val___' on: aStream.
		aStream lf.
	].
	anIndex = items size
		ifTrue: [body printSmalltalkOn: aStream]
		ifFalse: [
			self printItem: anIndex + 1 onStream: aStream.
			aStream nextPut: $.; lf
		].
	"``true'' -- NOT the clean __exit__ call, which now runs AFTER the handler
	is out of scope.  It used to be the last expression of this block, and that
	put it inside the very ``on: BaseException'' whose handler calls __exit__
	again: a manager whose __exit__ RAISED therefore had __exit__ invoked a
	SECOND time, with its own exception as the excinfo triple.

	CPython's semantics are the ones this method's own docstring already
	described -- the clean call belongs in the ``else'' of the try, which no
	``except'' covers -- so a raise out of __exit__(None, None, None)
	propagates, full stop.

	Found by vendoring asyncio.TaskGroup, whose __aexit__ raises
	BaseExceptionGroup on the normal path and then re-entered itself with its
	own ExceptionGroup, by which point its ``finally'' had already cleared
	_parent_task: ``'NoneType' object has no attribute 'uncancel'''.  It is not
	async-specific -- plain ``with'' had it identically."
	aStream nextPutAll: 'true'.
	aStream decreaseIndent; lf.
	aStream nextPutAll: '] @env0:on: BaseException do: [:___ex___ |'.
	aStream increaseIndent; lf.
	"Python's ``return``/``break``/``continue`` are GemStone signals that
	inherit from BaseException in this hierarchy, so they fall into this
	handler.  They are NOT real exceptions — the with-statement contract
	says the manager sees a clean __exit__(None, None, None) and the
	control-flow signal continues to its real target.  Filter them out
	before invoking __exit__ with exception details."
	aStream nextPutAll: '((___ex___ isKindOf: PythonReturn) @env0:or: [(___ex___ isKindOf: PythonBreak) @env0:or: [___ex___ isKindOf: PythonContinue]]) ifTrue: ['; lf.
	aStream nextPutAll: '    '; nextPutAll: self ___exitAwaitPrefix___; nextPutAll: '((___cm___ @env1:___pyAttrLoad___: #'''.
	aStream nextPutAll: self ___exitSelector___.
	aStream nextPutAll: ''') @env1:value: { None. None. None } value: nil).'; lf.
	aStream nextPutAll: '    ___ex___ @env0:pass'; lf.
	aStream nextPutAll: '].'; lf.
	"__exit__ receives PYTHON's exception, so it must be handed the PAYLOAD:
	``___ex___'' may be a carrier, a throwaway raised to deliver the real one
	without re-signalling it (BaseException ___signalCarrying___:).  Passing the
	carrier gave the manager an exception with no args -- which is how
	assertRaisesRegex started reporting ``'...' does not match '''''.  The #pass
	stays on ``___ex___'': a falsy __exit__ means the exception CONTINUES
	propagating, which is what #pass expresses, and the carrier is unwrapped by
	whichever handler finally catches it."
	"__exit__ runs ON BEHALF of the in-flight exception, so that exception is what
	sys.exc_info() must report while it runs -- and therefore what anything
	__exit__ itself raises gets as its __context__.  Without the wrapper,
	``def __exit__(self, t, v, tb): xyzzy'' produced a NameError with no context
	at all, losing the ``During handling of the above exception'' half of the
	report (test_raise test_context_manager)."
	aStream nextPutAll: '(BaseException @env0:___whileHandling___: (BaseException @env0:___payloadOf___: ___ex___) do: ['.
	aStream nextPutAll: self ___exitAwaitPrefix___; nextPutAll: '((___cm___ @env1:___pyAttrLoad___: #'''.
	aStream nextPutAll: self ___exitSelector___.
	aStream nextPutAll: ''') @env1:value: { (BaseException @env0:___payloadOf___: ___ex___) @env0:class. (BaseException @env0:___payloadOf___: ___ex___). nil } value: nil)]) @env1:___isTruthy___ ifFalse: [___ex___ @env0:pass]'.
	aStream decreaseIndent; lf.
	aStream nextPut: $].
	"THE CLEAN EXIT, outside the protection.  Reached only when the body ran to
	completion: the handler either #pass-es (so control never gets here) or
	falls off its end having SUPPRESSED the exception, in which case the
	on:do: answers the handler's value and not ``true''.

	``== true'' rather than ___isTruthy___ or a bare ifTrue:, because the value
	being tested is whatever the handler happened to answer -- nil today.  A
	nil reaching an inlined ifTrue: is an uncatchable error 2085, so the
	comparison is explicit.

	Using the block's value avoids adding a temp to every with-statement, which
	would cost stack frame width in a construct that can nest."
	aStream nextPutAll: ') @env0:== true ifTrue: ['.
	aStream increaseIndent; lf.
	self ___emitItemPosOn___: aStream for: item.
	aStream nextPutAll: '('; nextPutAll: self ___exitAwaitPrefix___; nextPutAll: '((___cm___ @env1:___pyAttrLoad___: #'''.
	aStream nextPutAll: self ___exitSelector___.
	aStream nextPutAll: ''') @env1:value: { None. None. None } value: nil))'.
	aStream decreaseIndent; lf.
	aStream nextPut: $].
	aStream decreaseIndent; lf.
	aStream nextPutAll: '] @env0:value: '.
	item context_expr printSmalltalkWithParenthesisOn: aStream.
	aStream nextPut: $)
%
method: WithAst
items
	^items
%
method: WithAst
items: newValue
	items := newValue
%
method: WithAst
body
	^body
%
method: WithAst
body: newValue
	body := newValue
%
method: WithAst
type_comment
	^type_comment
%
method: WithAst
type_comment: newValue
	type_comment := newValue
%

category: 'Grail-Code Generation'
method: WithAst
___awaitPrefix___
	"How the __enter__/__exit__ call is DRIVEN.

	A plain ``with'' awaits nothing, so the CLASS-side helper is right here: it
	passes a non-coroutine straight through, which is every synchronous manager.
	AsyncWithAst overrides it, because ``async with'' genuinely has to be able to
	SUSPEND -- see there."

	^ 'PythonCoroutine @env0:___grailAwait___: '
%

category: 'Grail-Code Generation'
method: WithAst
___emitProtocolPreflightOn___: aStream
	"Hook: validate the manager BEFORE the enter call.  The synchronous form
	emits nothing -- its protocol gaps surface through object's raising
	__enter__/__exit__ defaults, lazily but with the right message, and no
	failing shape demands more.  AsyncWithAst overrides: CPython's
	BEFORE_ASYNC_WITH loads both halves up front, and test_with_2 pins that
	a missing __aexit__ refuses before __aenter__ or the body runs."

	^ self
%

category: 'Grail-Code Generation'
method: WithAst
___enterAwaitPrefix___
	"Per-site refinement of ___awaitPrefix___.  A plain ``with'' drives both
	halves identically, so the defaults just delegate; AsyncWithAst overrides
	the pair, because CPython's rejection of a non-awaitable __aenter__ /
	__aexit__ RESULT names the method it came from and the shared prefix
	cannot."

	^ self ___awaitPrefix___
%

category: 'Grail-Code Generation'
method: WithAst
___exitAwaitPrefix___
	^ self ___awaitPrefix___
%

category: 'Grail-Code Generation'
method: WithAst
___enterSelector___
	"The half of the protocol this statement enters through.  ``async with'' runs
	the identical shape over the ``a''-prefixed pair, so the emit is shared and
	only the two selector names differ -- see AsyncWithAst."

	^ '__enter__'
%

category: 'Grail-Code Generation'
method: WithAst
___exitSelector___
	^ '__exit__'
%

category: 'Grail-other'
method: WithAst
___emitItemPosOn___: aStream for: anItem
	"Store the span of anItem's context-manager EXPRESSION into ___curPos___.

	Uses the same literal-array form ___emitCurPosBefore:on: emits for a
	statement, so ___pushFrameFromPos___ reads it back identically and the frame
	gains PEP 657 columns as well as the right line -- which is what lets
	``with A(), B(), C():'' underline the manager that actually failed.

	No-op outside a function (no ___curPos___ temp there) or when the expression
	carries no position."

	| expr lit |
	CallAst functionBeingCompiled isNil ifTrue: [^ self].
	expr := anItem context_expr.
	(expr isNil or: [expr beginLine isNil]) ifTrue: [^ self].
	lit := [expr ___pyPositionLiteralArray] on: Error do: [:ex | ex return: nil].
	lit isNil ifTrue: [^ self].
	self ___emitCurPosStore___: lit on: aStream
%
