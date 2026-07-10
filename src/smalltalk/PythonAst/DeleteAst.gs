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
					nextPutAll: target attr;
					nextPutAll: '''.'.
			] ifFalse: [
				(target isKindOf: NameAst) ifTrue: [
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
						temp.  NameAst wraps subsequent reads in
						UnboundLocalError ___checkLocal:, so a post-del
						read raises UnboundLocalError naming the
						variable."
						aStream nextPutAll: target id; nextPutAll: ' := nil.'
					]
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
