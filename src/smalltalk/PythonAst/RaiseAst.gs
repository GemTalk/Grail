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
		"Bare ``raise'' — re-raise the active exception.  WHICH exception that is
		is decided at RUNTIME, by BaseException class>>___reRaise___:, because
		CPython's rule is ``re-raise whatever sys.exc_info() points at'' and that
		is a property of the thread rather than of the text.  See there for the
		two cases where the text disagrees with the thread, in both directions.

		All this emit still decides is what to pass as the FALLBACK: the ___ex of
		the textually enclosing except handler when there is one, and nil when
		there is not.  The distinction is a compile-time necessity, not a
		semantic one -- outside a handler ``___ex'' is not in scope at all and
		naming it would be a CompileError during module load.

		The carrier is inside ___reRaise___: too.  This used to emit ``___ex
		pass''; #pass keeps the object's identity, which CPython requires, but
		continues the ORIGINAL handler search -- it resumes OUTSIDE the
		currently-active on:do:, so a handler established INSIDE this except body
		never saw the exception and it left the function instead.  A carrier
		delivers the same payload from an ordinary #signal, which is CPython's
		fresh search from the raise point."
		(self ___enclosingExceptHandler___ notNil)
			ifTrue: [aStream nextPutAll: 'BaseException @env0:___reRaise___: ___ex.']
			ifFalse: [aStream nextPutAll: 'BaseException @env0:___reRaise___: nil.'].
		^ self
	].
	exc ifNotNil: [
		((exc isKindOf: CallAst) and: [exc function isKindOf: NameAst]) ifTrue: [
			"raise ExceptionClass(*args, **kw) → ExceptionClass ___signalNew___:
			{args} kw: kwDict — construct with the full arg list, RUNNING any
			user-defined __init__ (a plain message-only signal skipped __init__
			and dropped all args past the first), then signal.

			Gated to BARE-NAME callees: only those reliably denote an
			exception class.  ``raise self.exception(...)`` (twilio) /
			``raise pkg.Cls(...)`` resolve through attribute loads —
			the callee there can be a BoundMethod (which DNU'd on
			___signalNew___); those fall through to the expression
			path below, which evaluates the CALL (running the class's
			synthesized value:value: + __init__, or the method body)
			and signals the resulting exception instance."
			"Route through BaseException ___pyRaiseNew___:args:kw:, which validates
			the (bare-name) callee is a BaseException subclass before constructing
			+ signalling -- ``raise NewStyleClass()'' must be a TypeError, not an
			MNU on ___signalNew___ (test_baseexception
			test_raise_new_style_non_exception)."
			aStream nextPutAll: 'BaseException @env1:___pyRaiseNew___: '.
			exc function printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: ' args: '.
			exc printArgumentsArrayOn: aStream.
			aStream nextPutAll: ' kw: '.
			exc printKeywordsDictOn: aStream.
			self printCauseKeywordOn: aStream.
			aStream nextPut: $..
		] ifFalse: [
			"raise expr → BaseException ___pyRaise___: expr, which validates expr is
			a BaseException instance/subclass (signalling it) and otherwise raises
			``TypeError: exceptions must derive from BaseException'' -- a bare class
			or a str can no longer MNU on #signal (test_baseexception
			test_raise_string / test_raise_new_style_non_exception)."
			aStream nextPutAll: 'BaseException @env1:___pyRaise___: '.
			exc printSmalltalkWithParenthesisOn: aStream.
			self printCauseKeywordOn: aStream.
			aStream nextPut: $..
		].
	].
%

category: 'Grail-other'
method: RaiseAst
printCauseKeywordOn: aStream
	"Append the ``cause:'' keyword for ``raise X from Y''.  Emitting nothing
	when there is no ``from'' clause selects the shorter selector, which is
	what distinguishes ``no cause at all'' from ``raise X from None'' -- the
	latter passes the None singleton, meaning suppress the implicit context
	but record no cause."

	cause ifNil: [^ self].
	aStream nextPutAll: ' cause: '.
	cause printSmalltalkWithParenthesisOn: aStream.
%

category: 'Grail-other'
method: RaiseAst
___enclosingExceptHandler___
	"Walk up the AST parent chain looking for an ExceptHandlerAst —
	the body of an ``except'' clause.  Returns the handler node if
	found, else nil.  Used by ``printSmalltalkOn:'' to decide whether
	bare ``raise'' can safely emit ``___ex pass'' (which requires the
	block parameter from the enclosing ``do: [:___ex | ...]'')."

	| node |
	node := parent.
	[node notNil] whileTrue: [
		(node isKindOf: ExceptHandlerAst) ifTrue: [^ node].
		node := node parent.
	].
	^ nil
%
method: RaiseAst
exc
	^exc
%
method: RaiseAst
exc: newValue
	exc := newValue
%
method: RaiseAst
cause
	^cause
%
method: RaiseAst
cause: newValue
	cause := newValue
%

category: 'Grail-IR Codegen'
method: RaiseAst
___irEligibleStatementLocals___: localNames
	"Three raise shapes, each optionally with a ``from'' cause: a bare re-raise
	(inside an except handler it names that handler's ___ex, which TryAst's IR
	emit registers on the builder while it emits the handler body; outside one
	it passes nil); ``raise Cls(args)'' with a bare-name callee (the
	___pyRaiseNew___ construct-and-signal); and ``raise expr''.  The callee /
	expr / args / cause must be emittable values."

	(cause notNil and: [(cause ___irEligibleValueLocals___: localNames) not])
		ifTrue: [^ false].
	exc isNil ifTrue: [^ true].
	((exc isKindOf: CallAst) and: [exc function isKindOf: NameAst]) ifTrue: [
		"Keywords and splats (cut 68) ride the same printArgumentsArrayOn: /
		printKeywordsDictOn: the call shapes use (___emitIRElementsArrayOn___:
		elts:, ___emitIRKeywordsOn___:)."
		(exc function ___irEligibleValueLocals___: localNames) ifFalse: [^ false].
		(exc keywords allSatisfy: [:k | k value ___irEligibleValueLocals___: localNames]) ifFalse: [^ false].
		^ exc arguments allSatisfy: [:a | a ___irEligibleValueLocals___: localNames]].
	^ exc ___irEligibleValueLocals___: localNames
%

category: 'Grail-IR Codegen'
method: RaiseAst
___emitIRStatementOn___: aBuilder
	"printSmalltalkOn:'s three shapes:
	  raise            -> BaseException @env0:___reRaise___: ___ex.   [in a handler]
	                      BaseException @env0:___reRaise___: nil.     [outside one]
	  raise Cls(args)  -> BaseException @env1:___pyRaiseNew___: (Cls)
	                        args: { args } kw: nil.   [bare-name callee]
	  raise expr       -> BaseException @env1:___pyRaise___: (expr).
	A ``from'' clause appends ``cause: (expr)'' to the latter two -- the longer
	selector is what distinguishes ``raise X from None'' (suppress the implicit
	context, record no cause) from no cause at all.

	The ___ex is the leaf TryAst registered on the builder for the innermost
	handler body being emitted; the text names the TEXTUALLY enclosing handler,
	and the two agree because a RaiseAst inside a handler body is emitted while
	that handler is open.  A bare raise inside a finally or a try body has no
	enclosing handler and passes nil, as text does."

	| base exLeaf |
	aBuilder at: self beginPosition.
	base := aBuilder globalNamed: #BaseException.
	exc isNil ifTrue: [
		exLeaf := self ___enclosingExceptHandler___ isNil
			ifTrue: [nil] ifFalse: [aBuilder currentHandlerEx].
		aBuilder add: (aBuilder
			send: #'___reRaise___:' to: base
			with: { exLeaf isNil ifTrue: [aBuilder nilLit] ifFalse: [aBuilder var: exLeaf] }
			env: 0).
		^ self].
	((exc isKindOf: CallAst) and: [exc function isKindOf: NameAst]) ifTrue: [
		| calleeV argsArray kw args |
		calleeV := exc function ___emitIRValueOn___: aBuilder.
		argsArray := exc ___emitIRElementsArrayOn___: aBuilder elts: exc arguments.
		kw := exc ___emitIRKeywordsOn___: aBuilder.
		args := OrderedCollection with: calleeV with: argsArray with: kw.
		cause ifNotNil: [:c | args add: (c ___emitIRValueOn___: aBuilder)].
		aBuilder at: self beginPosition.
		aBuilder add: (aBuilder
			send: (cause isNil
				ifTrue: [#'___pyRaiseNew___:args:kw:']
				ifFalse: [#'___pyRaiseNew___:args:kw:cause:'])
			to: base
			with: args asArray).
		^ self].
	exLeaf := exc ___emitIRValueOn___: aBuilder.
	cause isNil
		ifTrue: [
			aBuilder at: self beginPosition.
			aBuilder add: (aBuilder send: #'___pyRaise___:' to: base with: { exLeaf })]
		ifFalse: [
			| causeV |
			causeV := cause ___emitIRValueOn___: aBuilder.
			aBuilder at: self beginPosition.
			aBuilder add: (aBuilder
				send: #'___pyRaise___:cause:' to: base with: { exLeaf. causeV })].
	^ self
%

category: 'Grail-IR Codegen'
method: RaiseAst
___irReadLocalNamesInto___: aSet locals: localSet
	exc ifNotNil: [
		((exc isKindOf: CallAst) and: [exc function isKindOf: NameAst])
			ifTrue: [
				exc function ___irReadLocalNamesInto___: aSet locals: localSet.
				exc arguments do: [:a |
					a ___irReadLocalNamesInto___: aSet locals: localSet]]
			ifFalse: [exc ___irReadLocalNamesInto___: aSet locals: localSet]].
	cause ifNotNil: [:c | c ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%

category: 'Grail-IR Codegen'
method: RaiseAst
___irFlowBound___: boundIn locals: localSet
	^ self ___irFlowTerminates___: boundIn locals: localSet
%

category: 'Grail-IR Codegen'
method: RaiseAst
___irRefusalDetail___: localSet
	^ #'RaiseAst:other'
%
