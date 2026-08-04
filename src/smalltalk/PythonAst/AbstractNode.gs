! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ===============================================================================
! AST Node Class Definitions and Method Imports
! ===============================================================================
! This file defines all AST node classes used by the Grail Python parser
! and then imports their method implementations.
! ===============================================================================

! ------------------- Class definition for AbstractNode
expectvalue /Class
doit
Object subclass: 'AbstractNode'
  instVarNames: #( parent)
  classVars: #()
  classInstVars: #( fieldIndexMap)
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AbstractNode comment:
'https://docs.python.org/3/library/ast.html#ast.AST

This is the base of all AST node classes. The actual node classes are
derived from the Parser/Python.asdl file. They are defined in the _ast C
module and re-exported in ast.

There is one class defined for each left-hand side symbol in the abstract
grammar (for example, ast.stmt or ast.expr). In addition, there is one class
defined for each constructor on the right-hand side; these classes inherit
from the classes for the left-hand side trees.

Hierarchy:
Object
  AbstractNode
'
%

expectvalue /Class
doit
AbstractNode category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AbstractNode
removeallmethods AbstractNode
removeallclassmethods AbstractNode

set compile_env: 0

category: 'Grail-parser construction'
classmethod: AbstractNode
buildWithFields: aDictionary
	"Create an AST node from a dictionary of field name -> value mappings.
	Used by PythonParser to construct nodes."

	| node map |
	node := self basicNew.
	map := self fieldIndexMap.
	aDictionary keysAndValuesDo: [:key :value |
		| index |
		index := map at: key ifAbsent: [0].
		index > 0 ifTrue: [node instVarAt: index put: value].
	].
	^node
%

category: 'Grail-parser construction'
classmethod: AbstractNode
fieldIndexMap
	"Symbol(field name) -> 1-based instVarAt: index, cached per class.

	buildWithFields: is called once per AST node the parser builds -- many
	per expression -- and previously recomputed ``self allInstVarNames'' and
	then did a linear ``indexOf:'' (a Symbol= scan of the whole instVar list)
	for EVERY field of EVERY node: O(fields x instVars) per node.  The layout
	is fixed per class, so cache the field-name -> slot-index mapping in a
	class-instance variable and make each field lookup O(1).  The cache is
	per class (classInstVar, not classVar) because each AST subclass has its
	own instVar layout; it rebuilds automatically if the class is recompiled
	(the slot resets to nil)."

	^fieldIndexMap ifNil: [ | names m |
		names := self allInstVarNames.
		m := IdentityKeyValueDictionary new.
		1 to: names size do: [:i | m at: (names at: i) asSymbol put: i ].
		fieldIndexMap := m ]
%

category: 'Grail-other'
classmethod: AbstractNode
isAbstract

	^self == AbstractNode
%

category: 'Grail-other'
classmethod: AbstractNode
new

	self error: 'Use #buildWithFields: instead'.
%

category: 'Grail-accessors'
method: AbstractNode
parent

	^parent
%

category: 'Grail-other'
method: AbstractNode
allocateTemp

	^parent allocateTemp
%

category: 'Grail-initialization'
method: AbstractNode
declareVariable: aSymbol

	parent declareVariable: aSymbol.
%

category: 'Grail-other'
method: AbstractNode
globals

	^self module globals
%

category: 'Grail-testing'
method: AbstractNode
isInClass

	^parent isInClass
%

category: 'Grail-testing'
method: AbstractNode
isNone

	^false
%

category: 'Grail-initialization'
method: AbstractNode
isVariableIsDeclared: aSymbol
	"Walk up the parent chain looking for an enclosing scope (a BlockAst)
	that declares aSymbol as a local. Returns false if we reach the root
	without finding a declaration — i.e., aSymbol is a free name (resolved
	via the symbol list / builtins at runtime).

	When the walk crosses a FunctionDefAst boundary (we are climbing out
	of a function into its surrounding scope), switch to the
	``FromMethod`` variant on BlockAst nodes so any enclosing class
	body is invisible — Python class scope doesn't propagate into
	method bodies."

	parent isNil ifTrue: [^false].
	((self isKindOf: FunctionDefAst) or: [self isKindOf: LambdaAst]) ifTrue: [
		^ parent isVariableIsDeclaredFromMethod: aSymbol
	].
	^parent isVariableIsDeclared: aSymbol
%

category: 'Grail-initialization'
method: AbstractNode
isVariableIsDeclaredFromMethod: aSymbol
	"Default propagation for the ``FromMethod`` walk — delegate to
	parent.  BlockAst overrides to skip class-body locals."

	parent isNil ifTrue: [^false].
	^ parent isVariableIsDeclaredFromMethod: aSymbol
%

category: 'Grail-other'
method: AbstractNode
locals

	^parent locals
%

category: 'Grail-other'
method: AbstractNode
module

	^parent module
%

category: 'Grail-initialization'
method: AbstractNode
setParent: aNode
	"Set parent and recursively set parent on all child AST nodes."

	parent := aNode.
	2 to: self class allInstVarNames size do: [:i |
		| val |
		val := self instVarAt: i.
		(val isKindOf: AbstractNode) ifTrue: [
			val setParent: self.
		].
		"Array AND OrderedCollection — comprehension nodes hold their
		generators in an OrderedCollection; skipping it left every
		node under a genexp with a nil parent, silently disabling all
		parent-walk checks (comprehension-target shadowing, reserved-
		name rename, ...) inside comprehensions."
		((val isKindOf: Array) or: [val isKindOf: OrderedCollection]) ifTrue: [
			val do: [:each |
				(each isKindOf: AbstractNode) ifTrue: [
					each setParent: self.
				].
			].
		].
	].
%

category: 'Grail-other'
method: AbstractNode
printSmalltalkOn: aStream
	"Default backstop — every concrete AST node should override
	printSmalltalkOn:.  When a newly-parsed shape (e.g. async
	comprehensions, ``yield from``, ``@`` matmul) lands without
	an override, this default fires; quote the receiver's class
	name in the message so grep across src/smalltalk/PythonAst
	finds the file to add the override in without a debugger trip."

	self error:
		'AbstractNode is abstract; subclasses must implement printSmalltalkOn: -- offender = '
		, self class name asString.
%

category: 'Grail-other'
method: AbstractNode
printSmalltalkWithParenthesisOn: aStream

	aStream nextPut: $(.
	self printSmalltalkOn: aStream.
	aStream nextPut: $).

%

category: 'Grail-traceback'
method: AbstractNode
___emitCurPosBefore: aStmt on: aStream
	"Emit a runtime update of the enclosing function's ``___curPos___'' (its
	current execution position) BEFORE aStmt is emitted, so a traceback frame
	built while aStmt is executing points at the right line.  At statement
	granularity ___curPos___ holds just the beginLine as a bare SmallInteger --
	no array is allocated, so this store is free enough to sit before EVERY
	statement (including inside hot loop / if / try bodies via SuiteAst) without
	adding per-iteration GC pressure.  ___pushFrameFromPos___ reconstructs a
	line-only frame from the integer (columns / source line nil); sub-statement
	precision (e.g. a comprehension iterable) is recorded separately, at the
	sites where it matters, via ___pushTracebackFrame___ directly.

	No-op when NOT inside a function (module-level code has no ___curPos___
	temp; CallAst functionBeingCompiled is nil there) or when aStmt carries no
	position."

	(CallAst functionBeingCompiled isNil or: [aStmt beginLine isNil])
		ifTrue: [^ self].
	aStream
		nextPutAll: '___curPos___ := ';
		print: aStmt beginLine;
		nextPutAll: '.';
		lf
%

category: 'Grail-other'
method: AbstractNode
setBlock: aBlock
%

category: 'Grail-codegen helpers'
method: AbstractNode
___functionDeclaresLocal___: funcAst named: aSymbol
	"True iff the given FunctionDefAst or LambdaAst declares
	aSymbol as a parameter or in its body's BlockAst variables.
	Uses instVar access (no public getters on AST nodes).
	Lives on AbstractNode so any node (NameAst load codegen, but also
	with-as / except-as store codegen) can walk an enclosing function."

	| ivars argsIdx bodyIdx argsNode bodyNode argsIvars |
	ivars := funcAst class allInstVarNames.
	argsIdx := ivars indexOf: #args.
	bodyIdx := ivars indexOf: #body.
	argsNode := argsIdx > 0 ifTrue: [funcAst instVarAt: argsIdx] ifFalse: [nil].
	bodyNode := bodyIdx > 0 ifTrue: [funcAst instVarAt: bodyIdx] ifFalse: [nil].
	argsNode ifNotNil: [
		argsIvars := argsNode class allInstVarNames.
		#(#args #posonlyargs #kwonlyargs) do: [:fld |
			| idx list |
			idx := argsIvars indexOf: fld.
			idx > 0 ifTrue: [
				list := argsNode instVarAt: idx.
				list ifNotNil: [
					(list anySatisfy: [:a | a name asSymbol == aSymbol asSymbol])
						ifTrue: [^ true]
				].
			].
		].
		#(#vararg #kwarg) do: [:fld |
			| idx v |
			idx := argsIvars indexOf: fld.
			idx > 0 ifTrue: [
				v := argsNode instVarAt: idx.
				(v notNil and: [v name asSymbol == aSymbol asSymbol])
					ifTrue: [^ true].
			].
		].
	].
	((bodyNode isKindOf: BlockAst)
		and: [bodyNode variables includes: aSymbol asSymbol])
			ifTrue: [^ true].
	^ false
%

category: 'Grail-codegen helpers'
method: AbstractNode
___nearestEnclosingFunctionDeclaresGlobal___: aSymbol
	"True iff the NEAREST enclosing function's scope declares
	``global aSymbol''.  Python's rule: the declaration binds the name
	to the module for the WHOLE declaring scope -- reads, stores, and
	del of the name must route to the module even when an intermediate
	enclosing function has a same-named local (which would otherwise
	win the LEGB walk).  Reads the parser-recorded per-scope set
	(BlockAst>>globalNames); lambdas cannot contain statements, so a
	LambdaAst never declares one."

	| node ivars bodyIdx bodyNode gset |
	node := parent.
	[node notNil] whileTrue: [
		(node isKindOf: LambdaAst) ifTrue: [^ false].
		(node isKindOf: FunctionDefAst) ifTrue: [
			ivars := node class allInstVarNames.
			bodyIdx := ivars indexOf: #body.
			bodyNode := bodyIdx > 0 ifTrue: [node instVarAt: bodyIdx] ifFalse: [nil].
			(bodyNode isKindOf: BlockAst) ifFalse: [^ false].
			gset := bodyNode globalNames.
			^ gset notNil and: [gset includes: aSymbol asSymbol]
		].
		node := node parent.
	].
	^ false
%

category: 'Grail-codegen helpers'
method: AbstractNode
___pythonLocalInEnclosingFunctions___: aSymbol
	"True iff aSymbol is a TRUE PYTHON LOCAL (parameter or genuine body
	binding — the precise ``writes'' set, not the over-approximating
	``variables'' set) of ANY function/lambda enclosing this NameAst.
	Per LEGB, such a name shadows a same-named module-level function or
	module global; per the closure rule a binding in ANY enclosing
	function claims the name (Smalltalk block capture reaches outer
	temps), so keep walking past the innermost function.

	Comprehension targets are NOT python-locals of the function (they
	are comprehension-scoped; see ___isEnclosingComprehensionTarget___: for
	reads inside the comprehension itself), and global- / nonlocal-
	declared names were stripped from ``writes'' by the parser."

	| node prev |
	"``global aSymbol'' in the nearest enclosing function makes the name
	a MODULE binding for that whole scope -- never a local, and never
	resolved to an outer function's same-named local."
	(self ___nearestEnclosingFunctionDeclaresGlobal___: aSymbol) ifTrue: [^ false].
	prev := self.
	node := parent.
	[node notNil] whileTrue: [
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst])
			ifTrue: [
				"A LAMBDA reached through its ArgumentsAst -- i.e. this node is
				in the PARAMETER LIST (a default expression), not in the body --
				does NOT bind the name.  Python evaluates a default in the
				ENCLOSING scope at definition time, so
				``missing = 1; lambda missing=missing: missing'' must read the
				enclosing ``missing'' for the default and the parameter inside
				the body.  Without this, the default resolved as a read of the
				lambda's own parameter and was emitted into the def-time outer
				block where no such temp exists: CompileError 1001, ``undefined
				symbol missing''.

				Restricted to LambdaAst deliberately.  A def's defaults already
				resolve through FunctionDefAst's own default-capture path
				(``def root(context, missing=missing)'' is the jinja2 case its
				printSmalltalkOn: comment describes), and widening the rule to
				FunctionDefAst is a separate change with its own blast radius.

				A lambda nested in a def still sees the DEF's locals: the walk
				only skips the lambda it climbed out of, then carries on --
				``def f(): x = 1; return lambda x=x: x'' reads f's x."
				"An ANNOTATION of this very def: Python evaluates parameter and
				return annotations in the ENCLOSING scope, so the def's own
				parameters do not shadow.  Same rule as the lambda-default case
				above, and needed for the same reason -- the annotate function is
				built outside the def, where a parameter temp does not exist.  See
				CallAst >> annotationOwnerDefNode."
				(node == CallAst annotationOwnerDefNode
					or: [(node isKindOf: LambdaAst) and: [prev isKindOf: ArgumentsAst]])
					ifFalse: [
						(self ___functionBindsPythonLocal___: node named: aSymbol)
							ifTrue: [^ true]]].
		prev := node.
		node := node parent.
	].
	^ false
%

category: 'Grail-codegen helpers'
method: AbstractNode
___enclosingFunctionLocalBeyondClass___: aSymbol
	"True iff aSymbol is a python-local of an enclosing function BEYOND
	the nearest enclosing ClassDefAst -- i.e. this node sits in a
	class-method body (or a class nested in one) and the name belongs
	to an ENCLOSING def, not to the method itself (or a def nested in
	it).  The first binding function wins: bound before crossing a
	classdef -> a real temp of the compiled method -> false.

	On a NameAst this drives the closure-cell read for a method body's
	free variable; on a ClassDefAst it drives the cell-FORWARD store
	emitted in the enclosing method (the store's value must itself be
	read from the method's own cell, since a class-method body
	string-compiles with no lexical link to the outer temp)."

	| node passedClass |
	node := parent.
	passedClass := false.
	[node notNil] whileTrue: [
		(node isKindOf: ClassDefAst) ifTrue: [passedClass := true].
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst])
			ifTrue: [
				(self ___functionBindsPythonLocal___: node named: aSymbol)
					ifTrue: [^ passedClass]].
		node := node parent].
	^ false
%

category: 'Grail-codegen helpers'
method: AbstractNode
___moduleStoreReceiverExpr___
	"Smalltalk receiver expression for a module dynamic-instVar store /
	delete.  Inside the module body's initialize and top-level defs,
	``self'' IS the module instance; inside a user class METHOD it is
	the Python instance, so the store must reach the module singleton
	explicitly -- the case that arises when a method declares
	``global x'' (previously a CompileError: the guard bailed on
	classBeingCompiled and the bare temp had been stripped)."

	^ CallAst classBeingCompiled notNil
		ifTrue: [CallAst moduleClassBeingCompiled name , ' @env0:___instance___']
		ifFalse: ['self']
%

category: 'Grail-codegen helpers'
method: AbstractNode
___functionBindsPythonLocal___: funcAst named: aSymbol
	"True iff aSymbol is a TRUE PYTHON LOCAL of the given FunctionDefAst
	or LambdaAst: a parameter, or a genuine body binding (the block's
	``writes'' set — assignment / for / with-as / except-as / walrus
	targets, def / class / import names).

	Distinct from ___functionDeclaresLocal___:, which consults the
	block's ``variables'' set — that set over-approximates Python's
	locals (it also holds comprehension targets, f-string resolution
	hints, and every name needing a Smalltalk temp declaration), so it
	must not drive LEGB decisions.  ``writes'' excludes comprehension
	targets (comprehension-scoped in Python 3; see the parser's
	declareWrite:) and global- / nonlocal-declared names (stripped by
	popScope)."

	| ivars argsIdx bodyIdx argsNode bodyNode argsIvars writesSet |
	ivars := funcAst class allInstVarNames.
	argsIdx := ivars indexOf: #args.
	bodyIdx := ivars indexOf: #body.
	argsNode := argsIdx > 0 ifTrue: [funcAst instVarAt: argsIdx] ifFalse: [nil].
	bodyNode := bodyIdx > 0 ifTrue: [funcAst instVarAt: bodyIdx] ifFalse: [nil].
	argsNode ifNotNil: [
		argsIvars := argsNode class allInstVarNames.
		#(#args #posonlyargs #kwonlyargs) do: [:fld |
			| idx list |
			idx := argsIvars indexOf: fld.
			idx > 0 ifTrue: [
				list := argsNode instVarAt: idx.
				list ifNotNil: [
					(list anySatisfy: [:a | a name asSymbol == aSymbol asSymbol])
						ifTrue: [^ true]
				].
			].
		].
		#(#vararg #kwarg) do: [:fld |
			| idx v |
			idx := argsIvars indexOf: fld.
			idx > 0 ifTrue: [
				v := argsNode instVarAt: idx.
				(v notNil and: [v name asSymbol == aSymbol asSymbol])
					ifTrue: [^ true].
			].
		].
	].
	(bodyNode isKindOf: BlockAst) ifTrue: [
		writesSet := bodyNode writes.
		(writesSet notNil and: [writesSet includes: aSymbol asSymbol])
			ifTrue: [^ true]
	].
	^ false
%

category: 'Grail-codegen helpers'
method: AbstractNode
___emitModuleScopeStoreOf___: aNameSymbol from: sourceExpr on: aStream
	"Emit a Smalltalk store of the raw expression fragment sourceExpr
	into the Python name aNameSymbol.  When compiling a module body
	(not a user class) and aNameSymbol is a module-scope variable that
	no enclosing function shadows, route the store through
	``self @env0:dynamicInstVarAt: #name put: (...)'' — module-body
	methods carry module variables as dynamic instVars, not temps, so a
	bare ``name := ...'' would reference an undeclared temp and fail to
	compile.  Otherwise emit a bare assignment to the enclosing-scope
	temp.  Shared by with-as and except-as target bindings, mirroring
	ForAst>>emitForTargetStore:source:on:."

	| sym names moduleRoute |
	sym := aNameSymbol asSymbol.
	names := CallAst moduleVariableNames.
	"Module-route the store when (a) ``global sym'' is declared in the
	nearest enclosing function -- even inside a class method, and past
	any enclosing-function shadow -- or (b) we're in module context and
	sym is a module variable not shadowed by a TRUE python-local of an
	enclosing function (precise writes-based check, not the
	over-approximating ___functionDeclaresLocal___: variables walk)."
	moduleRoute := false.
	(CallAst moduleClassBeingCompiled notNil
		and: [self ___nearestEnclosingFunctionDeclaresGlobal___: sym])
		ifTrue: [moduleRoute := true].
	(moduleRoute not
		and: [(CallAst moduleClassBeingCompiled notNil)
		and: [(CallAst classBeingCompiled isNil)
		and: [(names notNil and: [names includes: sym])
		and: [(self ___pythonLocalInEnclosingFunctions___: sym) not]]]])
		ifTrue: [moduleRoute := true].
	moduleRoute
		ifTrue: [
			aStream
				nextPutAll: self ___moduleStoreReceiverExpr___;
				nextPutAll: ' @env0:dynamicInstVarAt: #''';
				nextPutAll: sym asString;
				nextPutAll: ''' put: (';
				nextPutAll: sourceExpr;
				nextPutAll: ').'.
			^ self].
	aStream
		nextPutAll: sym asString;
		nextPutAll: ' := ';
		nextPutAll: sourceExpr;
		nextPut: $.
%



category: 'Grail-testing'
method: AbstractNode
isUnconditionalReturn
	"True only for a top-level ReturnAst statement.  Statement emitters
	stop after one: Smalltalk rejects statements after ^ inside a
	block, so Python's (legal) unreachable code after `return` must be
	dropped at codegen."

	^ false
%

category: 'Grail-annotations'
method: AbstractNode
___annotationSourceString___
	"PEP 563-style source string for an annotation expression.  The
	annotation subset the unparser covers (Name / Attribute / Subscript /
	Tuple / BinOp union / string+None constants) is handled by per-node
	overrides; anything else falls back to this placeholder rather than
	evaluating (annotations are NEVER evaluated -- forward references to
	not-yet-defined names must not break module load)."

	^ '<annotation>'
%
