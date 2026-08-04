! ------------------- Superclass check
run
SuiteAst ifNil: [self error: 'SuiteAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for BlockAst
expectvalue /Class
doit
SuiteAst subclass: 'BlockAst'
  instVarNames: #( variables tempCount writes hasReturnBlocking globalNames)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
BlockAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from BlockAst
removeallmethods BlockAst
removeallclassmethods BlockAst

set compile_env: 0

category: 'Grail-other'
method: BlockAst
allocateTemp
	"Allocate a fresh, scoped temp name for codegen helpers (chained
	comparison cache, etc).  Prefix is ``___t_`` rather than bare
	``___N`` to avoid colliding with the numbered parameter
	placeholders FunctionDefAst emits for class-method headers
	(``foo: ___1 _: ___2 ...``).  A bare ``___1`` here would
	re-declare the placeholder as a block temp, shadowing the
	incoming argument with nil."

	| name |
	tempCount := (tempCount ifNil: [0]) + 1.
	name := ('___t_' , tempCount printString) asSymbol.
	variables add: name.
	^name
%

category: 'Grail-other'
method: BlockAst
declareVariable: aSymbol

	variables add: aSymbol.
%

category: 'Grail-other'
method: BlockAst
isVariableIsDeclared: aSymbol
	"Return true if aSymbol is declared as a local in this scope, or in any
	enclosing scope. Used by NameAst/CallAst codegen to decide whether a
	bare name like `abs` resolves to a builtin (apply the fast-path
	special case) or has been shadowed by a local."

	(variables includes: aSymbol) ifTrue: [^true].
	^super isVariableIsDeclared: aSymbol
%

category: 'Grail-other'
method: BlockAst
isVariableIsDeclaredFromMethod: aSymbol
	"Same walk as isVariableIsDeclared: but Python class scope is
	invisible from inside method bodies — when transiting through a
	class body's BlockAst (parent is ClassDefAst), skip its own
	variables and continue at the enclosing scope (module body).
	NameAst / CallAst use this entry when the query originates
	inside a function def nested in a class."

	(parent notNil and: [parent isKindOf: ClassDefAst]) ifFalse: [
		(variables includes: aSymbol) ifTrue: [^true].
	].
	parent isNil ifTrue: [^false].
	^ parent isVariableIsDeclaredFromMethod: aSymbol
%

category: 'Grail-other'
method: BlockAst
printSmalltalkOn: aStream

	self printSmalltalkOn: aStream useTemps: true.
%

category: 'Grail-other'
method: BlockAst
printSmalltalkOn: aStream useTemps: aBoolean
	"aBoolean gates whether the Python-level names bound in this scope are
	declared as Smalltalk block temps.  At module top level it is false
	because those names are module globals resolved through the symbol
	list, not block locals (declaring them would shadow the globals).

	Codegen HELPER temps (``___t_N'', allocated by allocateTemp to cache
	the shared middle operand of a chained comparison, etc.) are a
	different animal: they are genuine Smalltalk locals of THIS block and
	are never Python names, so they must be declared regardless of
	aBoolean.  Otherwise a chained comparison at module scope emits a
	reference to an undeclared ``___t_1'' and fails to compile."

	| toDeclare |
	toDeclare := aBoolean
		ifTrue: [variables]
		ifFalse: [variables select: [:each | each beginsWith: '___t_']].
	toDeclare notEmpty ifTrue: [
		aStream nextPut: $|.
		toDeclare do: [:each | aStream space; nextPutAll: each].
		aStream nextPutAll: ' |'; lf.
	].
	body do: [:each |
		self ___emitCurPosBefore: each on: aStream.
		each printSmalltalkOn: aStream.
		aStream lf.
		"Unreachable Python code after a top-level `return` must be
		dropped: Smalltalk rejects statements after ^ inside a block
		(test_fractions.Rat.__rmod__ has dead code after return)."
		each isUnconditionalReturn ifTrue: [^ self].
	].
%

category: 'Grail-other'
method: BlockAst
variables

	^variables
%

category: 'Grail-other'
method: BlockAst
hasReturnBlocking
	"True iff parsing encountered a node within this scope whose
	codegen emits statements AFTER the inlined body content in the
	same Smalltalk block — currently ``with'' and ``try'' with a
	non-empty ``finally:'' clause.  When this is true, a Python
	``return X'' inside the body MUST compile to ``PythonReturn
	___signal___: X'' rather than Smalltalk ``^ X.'', because
	GemStone rejects unreachable statements after ``^'' at parse
	time and the post-body cleanup would be exactly that.

	Set by the parser bottom-up via ``markScopeReturnBlocking'' at
	each ``with'' / ``try-finally'' parse point; propagation stops
	at the enclosing function/lambda/class boundary because each
	pushScope starts a fresh stack frame.

	May be nil for hand-built BlockAst nodes that predate the
	flag; callers should treat nil as false."

	^ hasReturnBlocking
%

category: 'Grail-other'
method: BlockAst
globalNames
	"Names declared ``global'' in this scope (parser-recorded from the
	globalStack at popScope time).  Python's rule: a global declaration
	makes the name refer to the module binding for the WHOLE declaring
	scope -- reads, stores, and del must all route to the module even
	when an intermediate enclosing function has a same-named local.
	May be nil for blocks built before this field existed; callers
	treat nil as empty."

	^ globalNames
%

category: 'Grail-other'
method: BlockAst
writes
	"Names that are written in this scope — assignment targets,
	augmented-assign targets, for-loop targets, walrus targets,
	except-as / with-as targets, function/class definition names,
	and import alias names.  Distinct from ``variables'', which also
	includes parameters declared on this scope (parameters live on
	the enclosing FunctionDefAst's args; we'd double-count if writes
	included them too).

	Populated by the parser's declareWrite: calls at each binding
	site.  May be nil for blocks built without write tracking (e.g.
	hand-constructed ASTs in older tests); callers should treat nil
	as an empty set."

	^ writes
%
method: BlockAst
variables: newValue
	variables := newValue
%
method: BlockAst
tempCount
	^tempCount
%
method: BlockAst
tempCount: newValue
	tempCount := newValue
%
method: BlockAst
writes: newValue
	writes := newValue
%
method: BlockAst
hasReturnBlocking: newValue
	hasReturnBlocking := newValue
%
method: BlockAst
globalNames: newValue
	globalNames := newValue
%
