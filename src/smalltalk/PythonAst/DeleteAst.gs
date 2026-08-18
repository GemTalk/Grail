! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for DeleteAst
expectvalue /Class
doit
StatementAst subclass: 'DeleteAst'
  instVarNames: #( targets)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
DeleteAst comment:
'https://docs.python.org/3/library/ast.html#ast.Del

Expression context for deletion (del statement).

Used as the ctx field in Name, Attribute, and Subscript nodes when they appear in a del statement.

Example:
>>> print(ast.dump(ast.parse(''del x''), indent=4))
Module(
    body=[
        Delete(
            targets=[Name(id=''x'', ctx=Del())])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
        DeleteAst
'
%

expectvalue /Class
doit
DeleteAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from DeleteAst
removeallmethods DeleteAst
removeallclassmethods DeleteAst
set compile_env: 0

category: 'Grail-Accessing'
method: DeleteAst
targets
	^ targets
%

category: 'Grail-other'
method: DeleteAst
printSmalltalkOn: aStream
	"Generate Smalltalk for `del target1, target2, ...`.

	For each target:
	  * SubscriptAst (del x[key]) → (x) __delitem__: (key)
	  * NameAst (del name) → name := nil
	  * AttributeAst (del obj.attr) → not yet supported, raises error

	See https://docs.python.org/3/reference/simple_stmts.html#the-del-statement"

	targets do: [:target |
		(target isKindOf: SubscriptAst) ifTrue: [
			"del x[key] → (x) __delitem__: (key)"
			aStream nextPut: $(.
			target value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: ') __delitem__: ('.
			target slice printSmalltalkOn: aStream.
			aStream nextPutAll: ').'.
		] ifFalse: [
			(target isKindOf: AttributeAst) ifTrue: [
				"del obj.attr → obj @env1:__delattr__: 'attr'.
				Routes through the ``__delattr__'' protocol so user
				overrides intercept; default ``object>>__delattr__:''
				falls through to ``___pyAttrDelete___:'' which raises
				AttributeError on miss and removes the slot otherwise.
				Name passed as a Smalltalk String (Python ``str''), not
				a Symbol — user override checks like ``name == 'x'''
				are str-vs-str in Python."
				target value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ' @env1:__delattr__: ''';
					nextPutAll: target ___mangledAttr___;
					nextPutAll: '''.'.
			] ifFalse: [
				(target isKindOf: NameAst) ifTrue: [
					"``nonlocal __class__; del __class__'' inside a METHOD.
					CPython's ``__class__'' is a cell every method of the class
					SHARES, so this empties that cell rather than unbinding
					anything local: afterwards every method's ``__class__'' read
					raises NameError and every zero-argument ``super()'' in the
					class reports ``empty __class__ cell'' -- in methods that did
					no deleting, and on every later call.

					Grail compiled it as a local delete, declaring a fresh
					``__class__'' temp and nilling it, which no read ever
					consulted: the statement was a no-op and a following
					``super()'' handed back a working proxy (test_super's
					test_obscure_super_errors).

					The ``nonlocal'' declaration is required and is not a
					formality -- without it CPython makes the name local to the
					def, so the delete raises UnboundLocalError and the cell is
					untouched.  Guarded on the class context as well, since a
					``__class__'' outside a class has no cell to empty and keeps
					the ordinary local branch below."
					(target id asSymbol == #'__class__'
						and: [CallAst classBodyRuntimeClass == nil
						and: [CallAst classBeingCompiled notNil
						and: [CallAst inClassBodyValueEmit ~~ true
						and: [CallAst ___functionDeclaresNonlocal___: #'__class__']]]])
						ifTrue: [
							CallAst ___printClassObjectOn___: aStream.
							aStream nextPutAll: ' @env1:___grailClearClassCell___.'
						] ifFalse: [
					"``del x'' in a CLASS BODY.  CPython's is DELETE_NAME on the
					body's own namespace: it unbinds the class attribute, raises
					NameError when nothing there is bound, and never reaches the
					enclosing function local or module global of the same name.

					Grail compiles a class body structurally, and a DeleteAst
					yields no attribute pair, so the whole statement used to be
					DROPPED -- ``class C: x = 1; del x'' left C.x == 1 and
					reported nothing.  Nor could the branches below stand in: the
					module one binds the wrong scope, and the function-local one
					(``x := nil'') would nil an ENCLOSING def's temp, which is
					precisely the binding CPython leaves alone
					(testClassNamespaceOverridesClosure asserts the outer x is
					still 42 after the class body deletes its own).

					classBodyRuntimeClass is set by ClassDefAst only around
					class-body-level statements, which is exactly the scope this
					applies to; a ``del'' inside a method compiles under no such
					flag and keeps the local branch."
					CallAst classBodyRuntimeClass ifNil: [
					(self isModuleScopeTarget: target) ifTrue: [
						"Phase A: `del name` at module scope truly removes
						the binding from the module instance's dynamic-
						instVar storage.  A subsequent read probes
						``self dynamicInstVarAt: ifAbsent: [NameError]''
						and raises Python's NameError on miss — matching
						CPython's module-scope semantics for ``del x''."
						aStream nextPutAll: self ___moduleStoreReceiverExpr___;
							nextPutAll: ' @env0:removeDynamicInstVar: #''';
							nextPutAll: target id;
							nextPutAll: '''.'.
					] ifFalse: [
						"Function-local `del name` → nil the Smalltalk
						temp.  NameAst wraps subsequent reads in an
						``ifNil: [UnboundLocalError
						___signalUnbound___: #name]'' guard, so a
						post-del read raises UnboundLocalError naming
						the variable."
						aStream nextPutAll: target id; nextPutAll: ' := nil.'
					]] ifNotNil: [:clsName |
						aStream nextPutAll: clsName;
							nextPutAll: ' @env1:___classBodyDefinitionalDelete___: #''';
							nextPutAll: target ___mangledId___;
							nextPutAll: '''.']]
				] ifFalse: [
					self error: 'del for ', target class name, ' is not yet supported'
				]
			]
		].
		aStream lf.
	].
%

category: 'Grail-other'
method: DeleteAst
isModuleScopeTarget: aNameAst
	"Phase A: true if this `del` target is a module-scope name —
	we're compiling inside a module body or top-level def (not a
	user class method), the name was declared in the module body's
	scope, and no enclosing function shadows it as a local."

	CallAst moduleClassBeingCompiled ifNil: [^ false].
	"``global x'' in the nearest enclosing function forces the module
	route -- even inside a class method (the emitters pick the module-
	instance receiver via ___moduleStoreReceiverExpr___) and past any
	enclosing-function shadow (Python: the declaration binds the name
	to the module for the whole declaring scope)."
	(aNameAst ___nearestEnclosingFunctionDeclaresGlobal___: aNameAst id)
		ifTrue: [^ true].
	CallAst classBeingCompiled ifNotNil: [^ false].
	(aNameAst isModuleVariableName: aNameAst id) ifFalse: [^ false].
	"PRECISE local-shadow check (writes + params; comprehension targets
	and global-declared names excluded) -- not the over-approximating
	___declaredInEnclosingFunction___: variables walk."
	(aNameAst ___pythonLocalInEnclosingFunctions___: aNameAst id) ifTrue: [^ false].
	^ true
%
method: DeleteAst
targets: newValue
	targets := newValue
%
