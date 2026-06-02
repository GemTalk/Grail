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
		"Bare ``raise'' — re-raise the active exception.  Two cases:
		  - Inside an ``except'' handler: emit ``___ex pass.''.  The
		    enclosing TryAst codegen puts ``___ex'' in scope as the
		    block parameter of ``do: [:___ex | ...]''.
		  - Outside any except handler: ``___ex'' isn't in scope and
		    the bare emit produces a CompileError.  CPython's
		    semantics here are ``re-raise whatever ``sys.exc_info()''
		    points at''; with no active exception it's a RuntimeError.
		    Approximate with a runtime RuntimeError raise — matches
		    CPython when there's no active exception, and lets
		    callers that reach this path get a clear failure mode
		    instead of a compile-time error during module load."
		(self ___enclosingExceptHandler___ notNil)
			ifTrue: [aStream nextPutAll: '___ex @env0:pass.']
			ifFalse: [aStream nextPutAll: 'RuntimeError @env1:___signal___: ''No active exception to re-raise''.'].
		^ self
	].
	exc ifNotNil: [
		(exc isKindOf: CallAst) ifTrue: [
			"raise ExceptionClass(*args, **kw) → ExceptionClass ___signalNew___:
			{args} kw: kwDict — construct with the full arg list, RUNNING any
			user-defined __init__ (a plain message-only signal skipped __init__
			and dropped all args past the first), then signal."
			exc function printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: ' ___signalNew___: '.
			exc printArgumentsArrayOn: aStream.
			aStream nextPutAll: ' kw: '.
			exc printKeywordsDictOn: aStream.
			aStream nextPut: $..
		] ifFalse: [
			"raise expr → expr @env0:signal"
			exc printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: ' @env0:signal.'.
		].
	].
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
