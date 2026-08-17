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
	aStream nextPutAll: '___val___ := (PythonCoroutine @env0:___grailAwait___: ((___cm___ @env1:___pyAttrLoad___: #'''.
	aStream nextPutAll: self ___enterSelector___.
	aStream nextPutAll: ''') @env1:value: { } value: nil)).'; lf.
	aStream nextPut: $[.
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
	self ___emitItemPosOn___: aStream for: item.
	aStream nextPutAll: '(PythonCoroutine @env0:___grailAwait___: ((___cm___ @env1:___pyAttrLoad___: #'''.
	aStream nextPutAll: self ___exitSelector___.
	aStream nextPutAll: ''') @env1:value: { None. None. None } value: nil))'.
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
	aStream nextPutAll: '    PythonCoroutine @env0:___grailAwait___: ((___cm___ @env1:___pyAttrLoad___: #'''.
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
	aStream nextPutAll: '(PythonCoroutine @env0:___grailAwait___: ((___cm___ @env1:___pyAttrLoad___: #'''.
	aStream nextPutAll: self ___exitSelector___.
	aStream nextPutAll: ''') @env1:value: { (BaseException @env0:___payloadOf___: ___ex___) @env0:class. (BaseException @env0:___payloadOf___: ___ex___). nil } value: nil)) @env1:___isTruthy___ ifFalse: [___ex___ @env0:pass]'.
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
	aStream nextPutAll: '___curPos___ := '; nextPutAll: lit; nextPutAll: '.'; lf
%
