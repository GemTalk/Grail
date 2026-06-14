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
	aStream nextPutAll: '([:___cm___ |'.
	aStream increaseIndent; lf.
	aStream nextPutAll: '| ___val___ |'; lf.
	aStream nextPutAll: '___val___ := ___cm___ @env1:__enter__.'; lf.
	aStream nextPut: $[.
	aStream increaseIndent; lf.
	item optional_vars ifNotNil: [
		(item optional_vars isKindOf: NameAst)
			ifTrue: [
				"Route ``with X as y'' through the module-scope-aware store
				so a module-level y binds the module variable rather than
				an undeclared temp."
				self ___emitModuleScopeStoreOf___: item optional_vars id
					from: '___val___' on: aStream.
				aStream lf]
			ifFalse: [
				item optional_vars printSmalltalkOn: aStream.
				aStream nextPutAll: ' := ___val___.'; lf].
	].
	anIndex = items size
		ifTrue: [body printSmalltalkOn: aStream]
		ifFalse: [
			self printItem: anIndex + 1 onStream: aStream.
			aStream nextPut: $.; lf
		].
	aStream nextPutAll: '___cm___ @env1:__exit__: None _: None _: None'.
	aStream decreaseIndent; lf.
	aStream nextPutAll: '] @env0:on: BaseException do: [:___ex___ |'.
	aStream increaseIndent; lf.
	"Python's ``return``/``break``/``continue`` are GemStone signals that
	inherit from BaseException in this hierarchy, so they fall into this
	handler.  They are NOT real exceptions — the with-statement contract
	says the manager sees a clean __exit__(None, None, None) and the
	control-flow signal continues to its real target.  Filter them out
	before invoking __exit__ with exception details."
	aStream nextPutAll: '((___ex___ @env0:isKindOf: PythonReturn) @env0:or: [(___ex___ @env0:isKindOf: PythonBreak) @env0:or: [___ex___ @env0:isKindOf: PythonContinue]]) ifTrue: ['; lf.
	aStream nextPutAll: '    ___cm___ @env1:__exit__: None _: None _: None.'; lf.
	aStream nextPutAll: '    ___ex___ @env0:pass'; lf.
	aStream nextPutAll: '].'; lf.
	aStream nextPutAll: '(___cm___ @env1:__exit__: ___ex___ @env0:class _: ___ex___ _: nil) @env1:___isTruthy___ ifFalse: [___ex___ @env0:pass]'.
	aStream decreaseIndent; lf.
	aStream nextPut: $].
	aStream decreaseIndent; lf.
	aStream nextPutAll: '] @env0:value: '.
	item context_expr printSmalltalkWithParenthesisOn: aStream.
	aStream nextPut: $)
%
