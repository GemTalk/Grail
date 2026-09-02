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
  classInstVars: #( )
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

category: 'Grail-other'
classmethod: AbstractNode
isAbstract

	^self == AbstractNode
%

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

category: 'Grail-codegen helpers'
method: AbstractNode
___rejectExceptStarFlowControl___: loopExitAllowed
	"Reject ``return'', ``break'' and ``continue'' that would escape an
	``except*'' block, which CPython makes a SyntaxError.

	The reason is the semantics: an except* block may run MORE THAN ONCE
	for one raised group -- once per matching clause -- and the remainder
	still has to propagate afterwards, so there is no coherent answer to
	what a ``return'' out of the middle of that should do.

	Three things are exempt, and each is exempt for its own reason:

	  * a nested ``def'' or ``lambda'' -- a return there belongs to THAT
	    function, and never leaves the except* block at all;
	  * a ``break''/``continue'' inside a loop written INSIDE the block --
	    the loop is its own target, so control stays put;
	  * anything in the try BODY, ``else'' or ``finally'' -- those are not
	    the handler, and CPython allows all three there.

	A nested TRY is NOT exempt: it introduces no scope and no loop, so a
	``return'' inside it still escapes.

	loopExitAllowed says whether an enclosing loop inside this block has
	been entered yet; return is rejected regardless of it."

	| childAllowed |
	"A nested function scope ends the walk: nothing inside it escapes."
	((self isKindOf: FunctionDefAst) or: [self isKindOf: LambdaAst])
		ifTrue: [^ self].
	(self isKindOf: ReturnAst) ifTrue: [^ self ___signalExceptStarFlowControl___].
	((self isKindOf: BreakAst) or: [self isKindOf: ContinueAst]) ifTrue: [
		loopExitAllowed ifTrue: [^ self].
		^ self ___signalExceptStarFlowControl___
	].
	childAllowed := loopExitAllowed
		or: [(self isKindOf: ForAst) or: [self isKindOf: WhileAst]].
	"Same instVar traversal setParent: uses -- a node's children are its
	AbstractNode-valued instVars plus the ones held in collections."
	2 to: self class allInstVarNames size do: [:i |
		| val |
		val := self instVarAt: i.
		(val isKindOf: AbstractNode)
			ifTrue: [val ___rejectExceptStarFlowControl___: childAllowed].
		((val isKindOf: Array) or: [val isKindOf: OrderedCollection]) ifTrue: [
			val do: [:each |
				(each isKindOf: AbstractNode)
					ifTrue: [each ___rejectExceptStarFlowControl___: childAllowed]]
		]
	]
%

category: 'Grail-codegen helpers'
method: AbstractNode
___signalExceptStarFlowControl___
	"CPython names all three in one message regardless of which appeared."

	^ SyntaxError signal:
		'''break'', ''continue'' and ''return'' cannot appear in an except* block'
%

category: 'Grail-codegen helpers'
method: AbstractNode
___collectModuleScopeStarImportsInto___: aCollection
	"Add to aCollection every ``from X import *'' statement reachable from
	this node WITHOUT leaving module scope, in source order.

	importlib >> expandStarImports: used to look only at the module body's
	own top-level statement list, so a star import written inside a ``try'',
	``if'', ``with'', ``for'' or ``while'' was never seen: it kept its lone
	``*'' alias and ImportFromAst >> printSmalltalkOn: emitted a per-name
	binding for it -- a Smalltalk variable literally NAMED ``*'':

	    * := ((((Python @env0:at: #builtins) instance) ___import__: ...

	which is a CompileError (``expected a right bracket''), uncatchable, and
	takes the session with it.  ``try: from .cyaml import * / except
	ImportError: pass'' is an extremely common idiom -- it is line one of
	pyyaml and of pydantic.

	A function, lambda or class body ENDS the walk rather than being
	searched: CPython makes a star import there a SyntaxError (``import *
	only allowed at module level'') and PythonParser >> parseFromImport
	already raises exactly that, so no star import can exist below one of
	those nodes.  Everything else is module scope -- Python's compound
	statements introduce no scope of their own -- so it is searched.

	Generic instVar traversal, the same one setParent: and
	___rejectExceptStarFlowControl___ use: a node's children are its
	AbstractNode-valued instVars plus the ones held in collections.  ``parent''
	points UP and is skipped by index (it is instVar 1 of AbstractNode)."

	((self isKindOf: FunctionDefAst)
		or: [(self isKindOf: LambdaAst) or: [self isKindOf: ClassDefAst]])
			ifTrue: [^ self].
	((self isKindOf: ImportFromAst)
		and: [self names size = 1 and: [(self names first name) == #'*']])
			ifTrue: [aCollection add: self].
	2 to: self class allInstVarNames size do: [:i |
		| val |
		val := self instVarAt: i.
		(val isKindOf: AbstractNode)
			ifTrue: [val ___collectModuleScopeStarImportsInto___: aCollection].
		((val isKindOf: Array) or: [val isKindOf: OrderedCollection]) ifTrue: [
			val do: [:each |
				(each isKindOf: AbstractNode)
					ifTrue: [each ___collectModuleScopeStarImportsInto___: aCollection]]
		]
	]
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

	No-op where there is no ___curPos___ temp to store into, or when aStmt
	carries no position.  That used to be the same question as ``are we inside a
	function'', and is not any more: the module body declares one too (see
	ModuleAst>>printSmalltalkOn:), so the test is functionBeingCompiled OR
	moduleBodyBeingCompiled."

	| node lit |
	((CallAst functionBeingCompiled isNil
		and: [CallAst moduleBodyBeingCompiled not])
			or: [aStmt beginLine isNil]) ifTrue: [^ self].
	"PEP 657 columns when the statement offers a span narrower than itself.
	___pyPositionLiteralArray answers a LITERAL array -- every element a
	compile-time constant -- so the store stays a pointer assignment that
	allocates nothing, exactly like the bare line store it replaces, and can
	still sit inside a hot loop.

	___pythonLineForMethod___ must be able to read the line back out of this
	form: a frame is IDENTIFIED as Python by that scan succeeding, so an
	unreadable store deletes the frame rather than just its columns.  That is
	what §9.38 mismeasured and §9.39 diagnosed; the scanner now steps over the
	``#('' and both shapes read alike."
	node := self ___curPosSpanNodeFor___: aStmt.
	node notNil ifTrue: [
		lit := [node ___pyPositionLiteralArray] on: Error do: [:ex | ex return: nil].
		lit notNil ifTrue: [
			self ___emitCurPosStore___: lit on: aStream.
			^ self]].
	self ___emitCurPosStore___: aStmt beginLine printString on: aStream
%

category: 'Grail-traceback'
method: AbstractNode
___emitCurPosStore___: aLiteralString on: aStream
	"Write one ``___curPos___ := <lit>.'' store and RECORD it as the store now in
	effect (CallAst class >> curPosLiteralInEffect).

	Every emitter of this store goes through here, so that the one emitter which
	displaces it -- LambdaAst, whose block is its own frame -- can put back
	whatever was standing rather than guessing at the statement's own span."

	aStream nextPutAll: '___curPos___ := '; nextPutAll: aLiteralString;
		nextPutAll: '.'; lf.
	CallAst curPosLiteralInEffect: aLiteralString
%

category: 'Grail-traceback'
method: AbstractNode
___emitCurPosRestoreCommentFor___: aLiteralString on: aStream
	"Put the enclosing ``___curPos___'' store back, for the SOURCE SCAN only, as
	a Smalltalk COMMENT.

	A frame's position is recovered by scanning the generated text backwards from
	the ip for the last ``___curPos___ := ...'' (BaseException class >>
	___derivePythonSpanForMethod___:ip:), and _sourceAtIp: reports comments along
	with everything else.  So a store emitted inside a block -- LambdaAst's, for
	the <lambda> frame -- is also found by every LATER ip in the ENCLOSING frame,
	whose own store now lies further back, and the caller ends up underlining the
	lambda's body.  A comment restores what the scan sees and costs nothing at run
	time, which a real statement could not: the lambda is an EXPRESSION, so there
	is no statement position after its closing bracket to put one in.

	The block's store writes a SHADOWED block temp, so there is nothing to undo at
	run time and this is purely textual.

	A source line holding a DOUBLE QUOTE would end the comment early, and the
	scan's literal parser un-doubles a doubled SINGLE quote but not a doubled
	DOUBLE quote, so such a line is dropped from the restored literal --
	``#(l c el ec nil)'' -- keeping the columns and losing the embedded text.
	traceback.FrameSummary prefers linecache over the embedded line anyway, so a
	frame in a file on disk renders identically; only source Grail cannot re-read
	(exec of a string) loses the line."

	| text q |
	aLiteralString isNil ifTrue: [^ self].
	text := aLiteralString.
	(text includes: $") ifTrue: [
		q := text indexOf: $'.
		q = 0 ifTrue: [^ self].
		text := (text copyFrom: 1 to: q - 1) , 'nil)'].
	aStream nextPutAll: ' "___curPos___ := '; nextPutAll: text; nextPutAll: '" '
%

category: 'Grail-codegen helpers'
method: AbstractNode
___curPosSpanNodeFor___: aStmt
	"The sub-expression a traceback should blame for aStmt, or nil to keep the
	line-only store.

	CPython's span is the RAISING OPERATION, not the statement.  For
	``return a / b'' it reports ``a / b'', so the statement's own span would
	underline the ``return'' too and draw a caret line CPython never draws.
	The value of a ``return'' or of a simple assignment IS that operation
	whenever the statement holds exactly one, which is the common shape.

	Deliberately an APPROXIMATION, and it stops short for a statement whose
	failure is a strict sub-expression: ``return o.attr.meth()'' blames the
	whole call here where CPython blames ``o.attr.meth'' if the attribute is
	what failed.  Going further needs a store before each nested operation, and
	Smalltalk expression emission is inline -- there is no statement boundary to
	hang one on without wrapping every operand in a block, which would allocate
	per evaluation.

	Answering nil for every other statement keeps them exactly as they were: a
	wrong span is worse than none (§9.10)."

	| ivars idx cls |
	aStmt isNil ifTrue: [^ nil].
	cls := aStmt class name asString.
	"A bare CALL statement IS the raising operation, so its own span is the one
	CPython reports -- ``boom()'' renders ``~~~~^^''.  This is the shape
	test_traceback's six exception-group tests assert on: their expected output
	carries a caret line under ``exception_or_callable()'', a call statement, so
	the return/assign rule alone left every one of them failing.  An expression
	statement is an ExprAst wrapping the call, so it takes the same ``value''
	path as a return."
	"A ``raise'' IS the operation, and CPython underlines the WHOLE statement --
	keyword included -- rather than the exception expression inside it:
	``raise ValueError('boom')'' reports cols 4..28 of its line, and
	``raise X from e'' runs to the end of the ``from'' clause.  So the span node
	here is the statement itself, not one of its children, which is why this
	test comes before the ``value'' lookup below rather than joining it.
	Measured against CPython 3.14.6 for plain, ``from'' and bare re-raise."
	cls = 'RaiseAst' ifTrue: [^ aStmt].
	"An ``assert'' is the other way round: CPython blames the TEST, not the
	statement -- ``assert x > 0, 'must be positive''' reports cols 11..16, which
	is ``x > 0''.  Underlining the whole statement would be a caret line CPython
	never draws."
	cls = 'AssertAst' ifTrue: [
		ivars := aStmt class allInstVarNames.
		idx := ivars indexOf: #test.
		idx = 0 ifTrue: [^ nil].
		^ aStmt instVarAt: idx].
	((cls = 'ReturnAst') or: [(cls = 'AssignAst') or: [cls = 'ExprAst']])
		ifFalse: [^ nil].
	ivars := aStmt class allInstVarNames.
	idx := ivars indexOf: #value.
	idx = 0 ifTrue: [^ nil].
	^ aStmt instVarAt: idx
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

	| node |
	node := parent.
	[node notNil] whileTrue: [
		(node isKindOf: LambdaAst) ifTrue: [^ false].
		(node isKindOf: FunctionDefAst) ifTrue: [
			^ self ___functionDeclaresGlobal___: node named: aSymbol].
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
				"A scope node reached through its ArgumentsAst -- i.e. this node
				is in the PARAMETER LIST (a default expression), not in the body
				-- does NOT bind the name.  Python evaluates a default in the
				ENCLOSING scope at definition time, so
				``missing = 1; def f(missing=missing)'' must read the enclosing
				``missing'' for the default and the parameter inside the body.

				This covers ``def'' as well as ``lambda''.  It was restricted to
				LambdaAst on the belief that a def's defaults already resolved
				through FunctionDefAst's own default-capture path; they did not,
				and the ``def f(x=x)'' idiom was broken three different ways:

				  * module-level def -- the default read the PARAMETER, which is
				    still nil while its own default is being computed, so
				    ``limit = 7; def f(v, limit=limit)'' answered nil
				  * def nested in a def, and lambda in a def, over a MODULE
				    global -- the hoisted def-time block emitted a bare
				    identifier for a name that is a module attribute there, so
				    the module failed to compile outright: CompileError 1001,
				    ``undefined symbol''.  A whole module lost to one def
				  * copy.py's own ``def _deepcopy_list(x, memo,
				    deepcopy=deepcopy)'' -- ten test_copy failures reading
				    ``'UndefinedObject' object is not callable''

				A lambda or def nested in a def still sees the OUTER def's
				locals: the walk only skips the scope it climbed out of, then
				carries on -- ``def f(): x = 1; return lambda x=x: x'' reads
				f's x."
				"An ANNOTATION of this very def: Python evaluates parameter and
				return annotations in the ENCLOSING scope, so the def's own
				parameters do not shadow.  Same rule as the lambda-default case
				above, and needed for the same reason -- the annotate function is
				built outside the def, where a parameter temp does not exist.  See
				CallAst >> annotationOwnerDefNode."
				(node == CallAst annotationOwnerDefNode
					or: [prev isKindOf: ArgumentsAst])
					ifFalse: [
						"``global aSymbol'' declared by THIS enclosing scope ends the
						walk.  The declaration makes the name a module binding for the
						whole of that scope, INCLUDING the functions nested inside it,
						so an outer function's same-named local must not claim it:

							x = 7
							def f():
								x = 1
								def g():
									global x
									def h(): return x    # 7, not f's 1

						Only the NEAREST enclosing function was consulted before (the
						guard above), which is the right rule for a STORE -- ``x = 1''
						in h binds h's own local -- but not for this walk, which is
						about which enclosing scope a free READ resolves to.  h read
						f's 1, and the further nesting the test uses (test_scope's
						testScopeOfGlobalStmt, four cases) is exactly what put an
						undeclaring scope in between."
						(self ___functionDeclaresGlobal___: node named: aSymbol)
							ifTrue: [^ false].
						(self ___functionBindsPythonLocal___: node named: aSymbol)
							ifTrue: [^ true]]].
		prev := node.
		node := node parent.
	].
	^ false
%

category: 'Grail-codegen helpers'
method: AbstractNode
___globalDeclarationWinsFor___: aSymbol
	"Walking outward from this node, is the first enclosing function scope
	that has anything to say about aSymbol one that declares it ``global''?

	Python resolves a name against the INNERMOST enclosing scope that either
	binds it or declares it, so the two possibilities have to be tested in the
	same walk rather than one after the other:

	    def f():
	        x = 1
	        def g():
	            global x
	            def h(): return x     # global -- g declared it
	            def k():
	                x = 5
	                return x          # k's own local, g's declaration is moot

	Answers false when neither is found, which leaves the name to the ordinary
	module/builtins lookup."

	| node prev |
	prev := self.
	node := parent.
	[node notNil] whileTrue: [
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst])
			ifTrue: [
				"Same two exclusions as ___pythonLocalInEnclosingFunctions___:
				-- an annotation and a lambda default are evaluated in the
				ENCLOSING scope, so the scope they are written in has no say."
				(node == CallAst annotationOwnerDefNode
					or: [prev isKindOf: ArgumentsAst])
					ifFalse: [
						(self ___functionDeclaresGlobal___: node named: aSymbol)
							ifTrue: [^ true].
						(self ___functionBindsPythonLocal___: node named: aSymbol)
							ifTrue: [^ false]]].
		prev := node.
		node := node parent.
	].
	^ false
%

category: 'Grail-codegen helpers'
method: AbstractNode
___functionDeclaresGlobal___: aFunctionNode named: aSymbol
	"Does aFunctionNode's own scope declare ``global aSymbol''?  The
	per-scope set the parser records on the body BlockAst.  A LambdaAst
	cannot contain statements, so it never declares one."

	(aFunctionNode isKindOf: FunctionDefAst) ifFalse: [^ false].
	^ self ___scopeNodeDeclaresGlobal___: aFunctionNode named: aSymbol
%

category: 'Grail-codegen helpers'
method: AbstractNode
___scopeNodeDeclaresGlobal___: aScopeNode named: aSymbol
	"Does aScopeNode's own scope declare ``global aSymbol''?  Works for a
	FunctionDefAst or a ClassDefAst -- both hold their statements in a
	``body'' BlockAst, and the parser records the per-scope global set there."

	| ivars bodyIdx bodyNode gset |
	ivars := aScopeNode class allInstVarNames.
	bodyIdx := ivars indexOf: #body.
	bodyNode := bodyIdx > 0
		ifTrue: [aScopeNode instVarAt: bodyIdx]
		ifFalse: [nil].
	(bodyNode isKindOf: BlockAst) ifFalse: [^ false].
	gset := bodyNode globalNames.
	^ gset notNil and: [gset includes: aSymbol asSymbol]
%

category: 'Grail-codegen helpers'
method: AbstractNode
___nearestEnclosingScopeDeclaresGlobal___: aSymbol
	"``global aSymbol'' declared by the nearest enclosing scope, counting a
	CLASS BODY as a scope -- which ___nearestEnclosingFunctionDeclaresGlobal___
	deliberately does not, since a class body is not a scope a nested function
	resolves free names through.

	For a STORE it is the right question, and a class body can be the scope
	that answers it:

	    x = 12
	    class Global:
	        global x
	        x = 13        # rebinds the MODULE x; Global gets no ''x'' attribute

	Grail read the declaration for neither part: it bound x as a class
	attribute and left the module binding at 12."

	| node |
	node := parent.
	[node notNil] whileTrue: [
		(node isKindOf: LambdaAst) ifTrue: [^ false].
		((node isKindOf: FunctionDefAst) or: [node isKindOf: ClassDefAst])
			ifTrue: [^ self ___scopeNodeDeclaresGlobal___: node named: aSymbol].
		node := node parent.
	].
	^ false
%

category: 'Grail-codegen helpers'
method: AbstractNode
___anyDescendantSatisfies___: aBlock
	"Depth-first search of this node's SUBTREE, answering true as soon as
	aBlock accepts a node.  Generic: it enumerates instance variables rather
	than knowing each AST class's shape, so a new node type is covered without
	being taught here.

	``parent'' is skipped by name -- it points UP, and following it would walk
	the tree forever.  Strings are collections but not node containers, so they
	are skipped too rather than iterated character by character.

	Used for questions that must be answered BEFORE emitting anything, where
	discovering the answer during the emit would come too late: a class's
	method sources are all generated in one pass, so a fact learned while
	generating the third method cannot change how the first was written."

	| ivars |
	(aBlock value: self) ifTrue: [^ true].
	ivars := self class allInstVarNames.
	1 to: ivars size do: [:i |
		| v |
		(ivars at: i) == #'parent' ifFalse: [
			v := self instVarAt: i.
			(v isKindOf: AbstractNode)
				ifTrue: [
					(v ___anyDescendantSatisfies___: aBlock) ifTrue: [^ true]]
				ifFalse: [
					((v isKindOf: Collection) and: [(v isKindOf: CharacterCollection) not])
						ifTrue: [
							v do: [:e |
								((e isKindOf: AbstractNode)
									and: [e ___anyDescendantSatisfies___: aBlock])
										ifTrue: [^ true]]]]]].
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
___manglingClassName___
	"The class whose name mangles a private identifier written at this node --
	CPython's ``the innermost enclosing class scope''.

	LEXICAL: the nearest ClassDefAst above this node.  ClassDefAst's ambient
	``classBeingCompiled'' is the older answer and stays as the fallback for
	synthesised nodes that have no parent chain, but it cannot be the primary
	one: it is deliberately CLEARED around the class-body name scans (see
	ClassDefAst -- isModuleScopeClassDef reads it as its `nested inside another
	class' test), and those scans are exactly where the class-attribute names are
	decided.  So the ambient alone declared ``__x = 1'' UNMANGLED while every
	read of it -- ``self.__x'', emitted later with the ambient set -- asked for
	_C__x.

	The walk starts at the PARENT: a node is mangled by an enclosing class,
	never by itself, so a nested ``class __Inner'' is mangled by its outer
	class."

	| node |
	node := self parent.
	[node notNil] whileTrue: [
		(node isKindOf: ClassDefAst) ifTrue: [^ node name asSymbol].
		node := node parent].
	^ CallAst classBeingCompiled
%

category: 'Grail-codegen helpers'
method: AbstractNode
___manglePrivate___: aName
	"Python PRIVATE-NAME MANGLING (CPython's _Py_Mangle).

	An identifier written inside a class body with TWO OR MORE leading
	underscores and NOT two trailing underscores is rewritten to
	_<Class><name>, so ``self.__x'' in class C stores _C__x.  That is what
	makes a private attribute per-class rather than shared: a subclass
	writing its own __x gets a different slot, and cannot read the base's.

	Not applied outside a class body, and never to a dunder (__x__) --
	which is why Grail's own ___internal___ names, and every __init__ /
	__slots__ / __new__, pass through untouched.

	Leading underscores are stripped from the CLASS name (class _C and
	class C both yield _C__x); an all-underscore class name mangles
	nothing, matching CPython."

	| s cls stripped i |
	cls := self ___manglingClassName___.
	cls isNil ifTrue: [^ aName].
	s := aName asString.
	"Must start with two underscores..."
	(s size > 2 and: [(s at: 1) == $_ and: [(s at: 2) == $_]]) ifFalse: [^ aName].
	"...and must NOT end with two."
	((s at: s size) == $_ and: [(s at: s size - 1) == $_]) ifTrue: [^ aName].
	"A dotted name is never mangled (CPython checks this too)."
	(s includesValue: $.) ifTrue: [^ aName].
	stripped := cls asString.
	i := 1.
	[i <= stripped size and: [(stripped at: i) == $_]] whileTrue: [i := i + 1].
	stripped := stripped copyFrom: i to: stripped size.
	stripped isEmpty ifTrue: [^ aName].
	^ '_' , stripped , s
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
___globalsViewReceiverExpr___
	"Smalltalk receiver expression for the LIVE NAMESPACE VIEW that
	``globals()'', module-scope ``locals()''/``vars()'' and bare ``dir()''
	wrap in a PyModuleDict.

	Not the same choice as ___moduleStoreReceiverExpr___, because a DOIT has
	no module instance at all: ``self'' is nil there, so those three all built
	a view over nil and every read or enumeration of it died sending
	``___globalNames___'' / ``___globalAt___:otherwise:'' to nil -- an
	uncatchable-looking UnboundLocalError from any exec'd code that called
	them (test_listcomps test_code_replace and test_code_replace_extended_arg
	call bare dir(); so does anything using locals() under exec).

	A doit's namespace is the symbol-list SymbolDictionary that
	ModuleAst >> ensureModuleScope: parks under ``___pyGlobals___'' for
	exactly this kind of use -- NameAst and AssignAst already reach doit
	globals through it.  PyModuleDict serves either shape; see its
	``___isDoitScope___''."

	^ ModuleAst compilingDoitScope notNil
		ifTrue: ['___pyGlobals___']
		ifFalse: [self ___moduleStoreReceiverExpr___]
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

	| ivars bodyIdx bodyNode writesSet ownIdx |
	(self ___functionBindsParameter___: funcAst named: aSymbol) ifTrue: [^ true].
	ivars := funcAst class allInstVarNames.
	bodyIdx := ivars indexOf: #body.
	bodyNode := bodyIdx > 0 ifTrue: [funcAst instVarAt: bodyIdx] ifFalse: [nil].
	(bodyNode isKindOf: BlockAst) ifTrue: [
		writesSet := bodyNode writes.
		(writesSet notNil and: [writesSet includes: aSymbol asSymbol])
			ifTrue: [^ true]
	].
	"A LAMBDA's body is an EXPRESSION, not a BlockAst, so the branch above
	never fires for one and a lambda looked like a scope that binds
	nothing but its parameters.  It can bind: ``lambda: (n := 1) + n'' is
	a walrus, and PEP 572 puts that binding in the lambda.  LambdaAst
	carries its own write set for exactly this -- without it the load
	walked PAST the lambda and claimed an enclosing function's same-named
	local, so ``n = 99; fn = lambda: (n := 1) + n'' answered 1 for the
	outer n where CPython leaves 99."
	ownIdx := ivars indexOf: #writes.
	ownIdx > 0 ifTrue: [
		writesSet := funcAst instVarAt: ownIdx.
		(writesSet notNil and: [writesSet includes: aSymbol asSymbol])
			ifTrue: [^ true]
	].
	^ false
%

category: 'Grail-codegen helpers'
method: AbstractNode
___functionBindsParameter___: funcAst named: aSymbol
	"True iff aSymbol is a PARAMETER of funcAst -- positional-only,
	ordinary, keyword-only, ``*args'' or ``**kwargs''.  The parameter
	half of ___functionBindsPythonLocal___:, split out because the
	unbound-local guard analysis needs to tell a parameter binding
	apart from a body binding: a parameter is bound before the Python
	body runs, a body binding may not be."

	| ivars argsIdx argsNode argsIvars |
	ivars := funcAst class allInstVarNames.
	argsIdx := ivars indexOf: #args.
	argsNode := argsIdx > 0 ifTrue: [funcAst instVarAt: argsIdx] ifFalse: [nil].
	argsNode isNil ifTrue: [^ false].
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
	^ false
%

category: 'Grail-codegen helpers'
method: AbstractNode
___guardedLocalNeedsCheck___: aSymbol
	"False when the unbound-local guard can be SKIPPED for a load of
	aSymbol -- i.e. the binding it resolves to is a PARAMETER that no
	``del'' can unbind.

	Only called once ___pythonLocalInEnclosingFunctions___: has already
	said this name is a true Python local of some enclosing function, so
	the global-declaration and lambda-default exclusions it applies have
	already been made; this walk repeats their shape to identify WHICH
	function owns the binding.

	A parameter is non-nil before the Python body runs in every calling
	convention Grail emits -- Smalltalk method argument, prologue temp
	(assigned, or TypeError for a missing argument), or rebind transport
	temp -- so the only way to unbind one is ``del''.  Defaults, ``*args'',
	``**kwargs'' and keyword-only parameters all resolve to a value or
	raise; a ``None'' default is the singleton, not nil.

	The INNERMOST enclosing function that binds the name decides.  If it
	binds it as a body local rather than a parameter, the guard stays --
	``def outer(): def inner(): return x; x = 1'' reads a binding that may
	genuinely be unset."

	| node prev owner |
	prev := self.
	node := parent.
	owner := nil.
	[node notNil and: [owner isNil]] whileTrue: [
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst])
			ifTrue: [
				(node == CallAst annotationOwnerDefNode
					or: [prev isKindOf: ArgumentsAst])
					ifFalse: [
						(self ___functionBindsPythonLocal___: node named: aSymbol)
							ifTrue: [owner := node]]].
		prev := node.
		node := node parent.
	].
	owner isNil ifTrue: [^ true].
	(self ___functionBindsParameter___: owner named: aSymbol) ifFalse: [^ true].
	^ owner deletedNamesInSubtree includes: aSymbol asSymbol
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
	"Same problem one scope in: a class-body ``with ... as x'' / ``except ...
	as e'' has no temp to bind either, because ClassDefAst emits the statement
	straight into the class-build code.  Route it to the per-class definitional
	store, which is also where NameAst reads it from (ClassDefAst >>
	___classBodyConditionalNames___ lists both forms)."
	self ___inClassBodyRuntimeScope___ ifTrue: [
		aStream
			nextPutAll: CallAst classBodyRuntimeClass;
			nextPutAll: ' @env1:___classBodyDefinitionalStore___: #''';
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

category: 'Grail-codegen helpers'
method: AbstractNode
___emitTargetStore___: aTarget from: sourceExpr on: aStream
	"Store the raw Smalltalk expression fragment ``sourceExpr'' into an
	arbitrary Python assignment TARGET: a name, an attribute, a subscript,
	or a (possibly nested, possibly starred) tuple/list.

	``with EXPR as TARGET'' is an assignment whose right-hand side is a
	value the emitter already holds in a Smalltalk temp rather than a
	Python expression node, so it cannot go through AssignAst.  WithAst
	handled only a bare NameAst and fell back to
	``TARGET printSmalltalkOn: ... := ...'' -- which is a LOAD emit of a
	STORE-context node.  Every other target shape was therefore broken:
	an attribute or subscript target died on ``Expression Context should
	be <Load> but is <Store>'', and a tuple target emitted
	``(tuple withAll: {a. b}) := val'', which is not valid Smalltalk.
	That is what stopped test.test_with importing at all.

	Names route through ___emitModuleScopeStoreOf___:from:on:, the only
	path that also covers a class-body ``with''.  Every other shape goes
	to the same per-element store AssignAst uses for tuple unpacking, so
	a with-target now gets its iterable coercion, ValueError value-count
	check, PEP 3132 star support and @property setter dispatch."

	(aTarget isKindOf: NameAst) ifTrue: [
		^ self ___emitModuleScopeStoreOf___: aTarget id from: sourceExpr on: aStream].
	^ self
		emitTupleElementStoreOn: aStream
		target: aTarget
		holder: '___tgt___'
		indexExpr: nil
		directRhs: sourceExpr
%

category: 'other'
method: AbstractNode
emitUnpackCoercionAndStoresOn: aStream elts: elts holder: holder
	"Shared tail of EVERY tuple/list unpack -- the top-level target and each
	nested one.  The caller has just written ``holder := <rhs>'' and left the
	statement open; append the iterable coercion + value-count check that
	closes it, then one store per target element.

	Factored out because the nested path used to do neither: it bound the
	inner holder straight to ``outer __getitem__: i'' and indexed that, so
	``(a, b), (c,) = IteratingSequenceClass(2), {42: 24}'' (test_iter
	test_unpack_iter) raised ``not subscriptable'' on an iterable that has
	__iter__ but no __getitem__, a nested target could not raise ValueError
	for the wrong number of values, and a nested STAR target did not compile
	at all -- StarredAst fell through to the plain-expression printer, which
	emits a ``*-unpack in call sites is not yet supported'' TypeError signal
	into the left-hand side of an assignment, a CompileError that took the
	whole enclosing module down with it.  A nested target is entitled to
	exactly the semantics of an outer one, so it now runs the same code."

	| starIdx nBefore hasStar nAfter |
	starIdx := elts findFirst: [:e | e isKindOf: StarredAst].
	hasStar := starIdx ~= 0.
	nBefore := hasStar ifTrue: [starIdx - 1] ifFalse: [elts size].
	nAfter := hasStar ifTrue: [elts size - starIdx] ifFalse: [0].
	"___unpackSequence___: sequences answer themselves (Object default);
	iterables WITHOUT positional __getitem__ (enum classes: `R, W, X =
	Perm`) materialize their iteration order as an indexable list --
	CPython unpacks via __iter__, this codegen indexes.  ___unpackCheck___
	then enforces CPython's value count (ValueError on too few / too many)."
	aStream nextPutAll: ' ___unpackSequence___ ___unpackCheck___: ';
		nextPutAll: nBefore printString;
		nextPutAll: ' star: '; nextPutAll: (hasStar ifTrue: ['true'] ifFalse: ['false']);
		nextPutAll: ' after: '; nextPutAll: nAfter printString; nextPutAll: '. '.
	starIdx = 0 ifTrue: [
		elts doWithIndex: [:elt :i |
			self
				emitTupleElementStoreOn: aStream
				target: elt
				holder: holder
				indexExpr: (i - 1) printString
		].
	] ifFalse: [
		elts doWithIndex: [:elt :i |
			i < starIdx ifTrue: [
				"Before the star — positive index from start."
				self
					emitTupleElementStoreOn: aStream
					target: elt
					holder: holder
					indexExpr: (i - 1) printString
			] ifFalse: [(i = starIdx)
				ifTrue: [
					"Star itself: slice from current index to (size-after-star) before end."
					| afterCount sliceExpr |
					afterCount := elts size - i.
					sliceExpr := holder , ' ___getslice___: ' , (i - 1) printString , ' _: '
						, (afterCount = 0 ifTrue: ['nil'] ifFalse: ['-' , afterCount printString])
						, ' _: nil'.
					self
						emitTupleElementStoreOn: aStream
						target: elt value
						holder: holder
						indexExpr: nil
						directRhs: sliceExpr
				] ifFalse: [
					"After the star — negative index from end."
					| offsetFromEnd |
					offsetFromEnd := elts size - i + 1.
					self
						emitTupleElementStoreOn: aStream
						target: elt
						holder: holder
						indexExpr: '-' , offsetFromEnd printString
				]
			].
		].
	]
%

category: 'other'
method: AbstractNode
emitTupleElementStoreOn: aStream target: aTarget holder: holder indexExpr: indexExpr
	"Convenience entry for the regular (non-star) per-element store
	— builds the holder __getitem__: <index> RHS."

	^ self
		emitTupleElementStoreOn: aStream
		target: aTarget
		holder: holder
		indexExpr: indexExpr
		directRhs: nil
%

category: 'Grail-codegen helpers'
method: AbstractNode
emitNameStoreOn: aStream target: aNameAst rhs: rhsSource
	"Emit a store of rhsSource into aNameAst as a single EXPRESSION, with
	no trailing period, so it can sit inside a larger expression.

	A ``global''-declared name has no Smalltalk temp -- the parser
	correctly does not declare one -- so a bare ``n := v'' there names an
	UNDEFINED SYMBOL and the enclosing method fails to compile.  Every
	binding construct that is not a plain assignment (match captures,
	walrus, def, class, import-as) needs this same routing, which is why
	it lives here rather than being open-coded per node."

	(self isModuleScopeStoreTarget: aNameAst)
		ifTrue: [
			aStream
				nextPutAll: self ___moduleStoreReceiverExpr___;
				nextPutAll: ' @env0:dynamicInstVarAt: #''';
				nextPutAll: aNameAst id;
				nextPutAll: ''' put: (';
				nextPutAll: rhsSource;
				nextPutAll: ')'.
			^ self].
	"A CLASS BODY has no temp to bind either -- ClassDefAst emits the statement
	straight into the class-build code -- so the same reasoning as the module
	branch applies one scope in, and ___emitModuleScopeStoreOf___: already had
	this case for the STATEMENT form.  Without it here, every target shape that
	routes through the tuple-unpack path failed to COMPILE in a class body:
	``with cm() as (u, v):'' reported ``undefined symbol u; undefined symbol v''
	and took the whole enclosing module down with it."
	self ___inClassBodyRuntimeScope___ ifTrue: [
		aStream
			nextPutAll: CallAst classBodyRuntimeClass;
			nextPutAll: ' @env1:___classBodyDefinitionalStore___: #''';
			nextPutAll: aNameAst id;
			nextPutAll: ''' put: (';
			nextPutAll: rhsSource;
			nextPutAll: ')'.
		^ self].
	"...and the same is true one emit-phase earlier, while ClassDefAst is
	emitting the class-ATTRIBUTE VALUE expressions.  The only binding form that
	reaches here from inside an expression is the walrus, and PEP 572 puts its
	target in the enclosing scope -- which for ``z = (n := 7) + n'' is the class
	namespace, so CPython leaves C.n == 7 beside C.z == 14.  Grail emitted a
	bare ``n := 7'' instead: an undeclared block temp, so the enclosing MODULE
	failed to compile (CompileError 1001, uncatchable from Python).  Routed
	through the definitional store, which answers the VALUE rather than the
	receiver, so it composes as an expression -- the case its comment already
	named.  Parenthesized because it is a keyword send and the walrus can sit
	anywhere an expression can."
	(CallAst inClassBodyValueEmit == true
		and: [CallAst ___classBeingCompiledVar___ notNil
		and: [self ___inClassBodyAttributeValueScope___]]) ifTrue: [
		aStream
			nextPutAll: '(';
			nextPutAll: CallAst ___classBeingCompiledVar___;
			nextPutAll: ' @env1:___classBodyDefinitionalStore___: #''';
			nextPutAll: aNameAst id;
			nextPutAll: ''' put: (';
			nextPutAll: rhsSource;
			nextPutAll: '))'.
		^ self].
	aNameAst printSmalltalkOn: aStream.
	aStream nextPutAll: ' := '; nextPutAll: rhsSource
%

category: 'other'
method: AbstractNode
emitTupleElementStoreOn: aStream target: aTarget holder: holder indexExpr: indexExpr directRhs: directRhs
	"Emit a single target's store inside a tuple-unpack.  Handles
	NameAst (plain assignment), AttributeAst (env-1 setter or
	classmethod self-ref instVar write), SubscriptAst
	(``obj[i] = ...``), and nested Tuple/List targets (recurse).

	``directRhs`` is a pre-built Smalltalk source expression used
	for the star-slice path; when nil, the RHS is
	``holder __getitem__: indexExpr``."

	| rhs |
	rhs := directRhs ifNil: [holder , ' __getitem__: ' , indexExpr].
	(aTarget isKindOf: AttributeAst) ifTrue: [
		"obj.attr = rhs (per-element store inside a tuple unpack) —
		route through ``__setattr__:_:'' (both self and foreign receivers)
		so @property setters fire.  Object>>__setattr__:_: detects the
		paired getter+setter at runtime and dispatches to the setter;
		otherwise falls through to dynamic-instVar storage."
		((aTarget value isKindOf: NameAst)
			and: [(CallAst isSelfReference: aTarget value id)
				and: [(aTarget value ___boundInNestedFunction___: aTarget value id) not]]) ifTrue: [
			"Slot attribute → assign the mangled instVar directly by bare name."
			((CallAst classSlotNames notNil)
				and: [CallAst classSlotNames includes: aTarget ___mangledAttr___ asSymbol]) ifTrue: [
				aStream
					nextPutAll: '___slot_';
					nextPutAll: aTarget ___mangledAttr___;
					nextPutAll: '___ := (';
					nextPutAll: rhs;
					nextPutAll: '). '.
				^ self
			].
			aStream
				nextPutAll: 'self @env1:__setattr__: ''';
				nextPutAll: aTarget ___mangledAttr___;
				nextPutAll: ''' _: (';
				nextPutAll: rhs;
				nextPutAll: '). '.
			^ self
		].
		aTarget value printSmalltalkWithParenthesisOn: aStream.
		aStream
			nextPutAll: ' @env1:__setattr__: ''';
			nextPutAll: aTarget ___mangledAttr___;
			nextPutAll: ''' _: (';
			nextPutAll: rhs;
			nextPutAll: '). '.
		^ self
	].
	(aTarget isKindOf: SubscriptAst) ifTrue: [
		"obj[idx] = rhs — __setitem__:_: dispatch."
		aTarget value printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ' __setitem__: '.
		aTarget slice printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ' _: ('; nextPutAll: rhs; nextPutAll: '). '.
		^ self
	].
	((aTarget isKindOf: TupleAst) or: [aTarget isKindOf: ListAst]) ifTrue: [
		"Nested unpacking: recurse using a fresh holder, through the SAME
		coercion + value-count + star emitter the top-level target uses.
		The RHS is parenthesized because it is a keyword message
		(``holder __getitem__: 0''), and ___unpackSequence___ is unary."
		| nestedHolder |
		nestedHolder := holder , '_n'.
		aStream nextPutAll: '[| '; nextPutAll: nestedHolder; nextPutAll: ' | ';
			nextPutAll: nestedHolder; nextPutAll: ' := ('; nextPutAll: rhs; nextPutAll: ')'.
		self emitUnpackCoercionAndStoresOn: aStream elts: aTarget elts holder: nestedHolder.
		aStream nextPutAll: '] value. '.
		^ self
	].
	"Default: NameAst / starred wrapper.  Routed through
	emitNameStoreOn:target:rhs:, which knows every home a Python name can
	have -- a module dynamic instVar, the per-class definitional store, or an
	enclosing Smalltalk temp.  This was open-coded and knew only the module
	one, so a class-body unpack emitted a bare ``u := ...'' naming an
	undefined symbol and the enclosing module failed to compile:
	``with cm() as (u, v):'' in a class body was a CompileError, not a
	NameError."
	(aTarget isKindOf: NameAst) ifTrue: [
		self emitNameStoreOn: aStream target: aTarget rhs: rhs.
		aStream nextPutAll: '. '.
		^ self].
	aTarget printSmalltalkOn: aStream.
	aStream nextPutAll: ' := '; nextPutAll: rhs; nextPutAll: '. '
%

category: 'Grail-other'
method: AbstractNode
isModuleScopeStoreTarget: aNameAst
	"Phase A: true if this assignment target is a module-scope name —
	i.e. we're compiling inside a module body or top-level def (not a
	user class method), and the name was declared in the module body's
	scope (parser-recorded into ``CallAst moduleVariableNames''), and
	no enclosing function shadows it as a local."

	CallAst moduleClassBeingCompiled ifNil: [^ false].
	"``global x'' in the nearest enclosing SCOPE forces the module
	route -- even inside a class method (the emitters pick the module-
	instance receiver via ___moduleStoreReceiverExpr___) and past any
	enclosing-function shadow (Python: the declaration binds the name
	to the module for the whole declaring scope).

	A CLASS BODY counts as that scope.  ``class C: global x; x = 13''
	rebinds the module's x and leaves C without an ``x'' attribute;
	asking only about enclosing FUNCTIONS missed the declaration and
	stored a class attribute instead."
	(aNameAst ___nearestEnclosingScopeDeclaresGlobal___: aNameAst id)
		ifTrue: [^ true].
	CallAst classBeingCompiled ifNotNil: [^ false].
	(aNameAst isModuleVariableName: aNameAst id) ifFalse: [^ false].
	"PRECISE local-shadow check (writes + params; comprehension targets
	and global-declared names excluded) -- not the over-approximating
	___declaredInEnclosingFunction___: variables walk."
	(aNameAst ___pythonLocalInEnclosingFunctions___: aNameAst id) ifTrue: [^ false].
	^ true
%

category: 'Grail-Class Body'
method: AbstractNode
___inClassBodyRuntimeScope___
	"True while ClassDefAst is emitting a class-body ``try'' / ``for'' /
	``while'' / ``with'' verbatim (CallAst >> classBodyRuntimeClass is set)
	AND this node sits directly in that class body rather than inside a def
	nested within it.

	The flag stays set for the whole statement emit, INCLUDING any nested def
	or class, so this scope test is what keeps the class-attribute routing off
	genuine locals: walking out, the first FunctionDefAst-or-ClassDefAst
	reached must be the ClassDefAst."

	| node |
	CallAst classBodyRuntimeClass ifNil: [^ false].
	node := self parent.
	[node notNil] whileTrue: [
		(node isKindOf: FunctionDefAst) ifTrue: [^ false].
		(node isKindOf: ClassDefAst) ifTrue: [^ true].
		node := node parent].
	^ false
%

category: 'Grail-Class Body'
method: AbstractNode
___inClassBodyAttributeValueScope___
	"True when this node sits DIRECTLY in a class body -- not inside a def,
	lambda or nested class within it.

	The twin of ___inClassBodyRuntimeScope___ for the other class-body emit
	phase: that one covers a compound statement emitted verbatim, this one the
	attribute VALUE expressions, where CallAst classBodyRuntimeClass is nil and
	inClassBodyValueEmit is the flag that is set.  The callers pair it with
	that flag; kept separate because the scope question and the phase question
	have different answers -- the flag stays set across a nested def's whole
	emit, and it is this walk that keeps class-attribute routing off that def's
	genuine locals.

	LambdaAst ends the walk as well as FunctionDefAst: a walrus in a class-body
	lambda (``f = lambda: (n := 1)'') binds inside the lambda, which does have a
	Smalltalk temp for it."

	| node |
	node := self parent.
	[node notNil] whileTrue: [
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst])
			ifTrue: [^ false].
		(node isKindOf: ClassDefAst) ifTrue: [^ true].
		node := node parent].
	^ false
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

category: 'Grail-IR Codegen'
method: AbstractNode
___irEligibleStatementLocals___: localNames
	"Default: a node is NOT an IR-emittable statement.  Overridden by the
	statement nodes the direct-to-IR path handles (see MIGRATION.md).
	``localNames'' is the Set of in-scope local/parameter name Strings."

	^ false
%

category: 'Grail-IR Codegen'
method: AbstractNode
___irEligibleValueLocals___: localNames
	"Default: a node is NOT an IR-emittable value.  Overridden by the
	expression nodes the direct-to-IR path handles."

	^ false
%

category: 'Grail-IR Codegen'
method: AbstractNode
___emitIRStatementOn___: aBuilder
	"Default: this node type is not an emittable statement.  Reached only on an
	___irEligible___ gap; ___buildModuleClassBody:name: catches it and falls
	back to text compilation."

	^ Error signal: 'IR codegen: ' , self class name asString
		, ' is not an emittable statement'
%

category: 'Grail-IR Codegen'
method: AbstractNode
___emitIRValueOn___: aBuilder
	"Default: this node type is not an emittable value.  See
	___emitIRStatementOn___: for the fallback contract."

	^ Error signal: 'IR codegen: ' , self class name asString
		, ' is not an emittable value'
%

category: 'Grail-annotations'
method: AbstractNode
___defaultSourceString___
	"Source text for a DEFAULT VALUE expression, as inspect.signature prints it.

	Separate from ___annotationSourceString___ because the two callers want
	different renderings of the same node, and sharing one unparser produced
	wrong text for both defaults and, in one case, a structurally CORRUPT
	signature.  A string literal is the clearest split: an annotation stores a
	forward reference verbatim (``x: 'Foo''' -> ``Foo'', PEP 563), while a
	default must be its repr (``a='abc''' -> ``'abc''').  Rendering a default
	the annotation way gave ``a=abc'' and, for the empty string, ``b='' --
	nothing at all.

	Delegates by default, so every shape the annotation unparser already renders
	correctly (Name, Attribute, Subscript, BinOp) keeps working and only the
	nodes that genuinely differ override."

	^ self ___annotationSourceString___
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

category: 'Grail-code generation'
method: AbstractNode
emitSourceFilenameLiteralOn: aStream
	"Instance-side twin of the class-side implementation below -- the emitters
	that need this are a mix (ComprehensionAst's is a classmethod, TryAst's and
	FunctionDefAst's are instance methods), and it depends on no instance state."

	^ self class emitSourceFilenameLiteralOn: aStream
%

category: 'Grail-code generation'
classmethod: AbstractNode
emitSourceFilenameLiteralOn: aStream
	"Write the Smalltalk string literal for this code object's ``co_filename'':
	the module's real path when one is known (CallAst >> sourcePath, set for the
	duration of ___buildModuleClass:name:), else the ``'<grail>''' placeholder
	that file-less code -- exec, eval, the REPL doit path -- keeps.

	Shared by every PyCode emitter (FunctionDefAst's def-time cascade and
	emitPyCodeExprOn:qualname:, ComprehensionAst's traceback-frame push,
	TryAst's catching-frame push) so they cannot disagree about the filename of
	the same module, and so the quoting is done in exactly one place.

	A path can legally contain a single quote, which would terminate the
	literal early and produce uncompilable generated code, so quotes are
	doubled -- the same escaping the other string-literal emitters do."

	| p |
	p := CallAst sourcePath.
	aStream nextPut: $'.
	p isNil
		ifTrue: [aStream nextPutAll: '<grail>']
		ifFalse: [
			p asString do: [:c |
				c == $' ifTrue: [aStream nextPut: $'].
				aStream nextPut: c]].
	aStream nextPut: $'
%

category: 'Grail-IR Codegen'
method: AbstractNode
___irReadLocalNamesInto___: aSet locals: localSet
	"Collect the LOCAL names (members of localSet) read in this subtree into
	aSet.  Default: a leaf that reads nothing.  Overridden by the expression /
	statement nodes the IR path handles; the flow analysis only walks those."

	^ self
%

category: 'Grail-IR Codegen'
method: AbstractNode
___irWriteLocalNamesInto___: aSet locals: localSet
	"Collect the LOCAL names (members of localSet) WRITTEN anywhere in this
	subtree into aSet.  Default: a node that writes nothing.  Overridden by the
	write-carrying statements (Assign, AugAssign) and the statement containers
	(If, While, Block, Suite).  Sound within an IR-ELIGIBLE def: eligibility is
	established before the flow analysis runs, and every eligible statement
	shape's writes are covered by those overrides."

	^ self
%

category: 'Grail-IR Codegen'
method: AbstractNode
___irLocalWriteTarget___: localSet
	"The NameAst this statement writes as a plain top-level local binding, or
	nil.  ___irAssignFlowSafe___: uses it to grow the bound set walking the
	top-level statements and to require every local write to be top-level.
	Overridden by the write-carrying statements the IR path handles (Assign,
	AugAssign)."

	^ nil
%
