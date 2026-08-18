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
