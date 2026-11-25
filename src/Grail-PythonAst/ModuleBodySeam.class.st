"The module body as several methods: the STATEMENT SEAM, steps P4.1 and P4.2
of the IR-only codegen plan.

A module's env-1 ``initialize'' used to be one text method holding every
module statement.  Under the seam it is built through PyMethodIRBuilder and
is nothing but a list of sends, ``self ___irModStmt_<offset>___'', one per
HELPER; each helper holds a run of consecutive statements, and each class
statement has a helper of its own.  A method cannot mix IR and text, but a
module can mix methods.

IR HELPERS AND TEXT HELPERS (P4.2).  A statement the IR path can build at
module scope -- an expression, a plain, augmented or annotated assignment, an
import (a star import too), a del, an if / for / while over such statements,
pass, raise, assert, global (irRefusalOf:) -- is built through IR, and a run of them is an IR
helper: its statements' own IR emitters (___emitIRStatementOn___:) on one
PyMethodIRBuilder, with the module source of the run attached as its Python,
exactly as a def's IR method is built.  Every other statement -- a def, a
class, a try, a with, a statement holding a lambda or a comprehension (P4.3,
P4.4) -- is text, and a run of those is a text helper, cut from the text
emit as in P4.1.  A run is ONE KIND: the two alternate in source order.

WHY SEVERAL METHODS, AND WHY FOR GOOD.  P0.7 measured two limits that are per
METHOD: past about 12k words of code a method loses its traceback frame (the
kernel cannot read its debug info), and an IR method holds at most 8,192
string-literal slots.  The largest module bodies are 13k-46k words.  So the
split is the end state, and every group is checked against a BUDGET on the
method actually generated -- words (basicSize), step points
(_numSourceOffsets) and string literals in its literal frame, which in 4.0 its
blocks share -- and split in half when it is over, an IR group as much as a
text one.  One statement over budget cannot be split here; it is kept (it was
in the one big method before) and counted, ``mh:overBudget''.

EMITTED ONCE.  A statement is emitted by ONE backend.  The text statements are
written into one stream by ModuleAst >> ___emitSeamChunksOn___:skipping:,
which records each one's text range and position-map range, and leaves the IR
statements' chunks empty; a text helper is a slice of that text under its own
header, with its own slice of the map, so splitting a text group re-cuts and
never re-runs the text codegen, whose side effects (def ids, sequence numbers)
must happen once.  An IR group is built from the AST, and a split builds each
half again: the statements it admits are the ones whose IR build registers
nothing (no def, class, lambda or comprehension), which is what makes that
safe.  An IR group whose build FAILS is written as text then, at the end of
the stream (___emitTextFrom:to:), and compiled as a text helper -- a counted
fallback, and a raise in strict mode.  A method may therefore take its text
from pieces of the stream that are not adjacent (sourceFor:chunks:).

THE FRAMES.  CPython has one ``<module>'' frame.  The helper running a
statement knows its line -- a text helper from its ``___curPos___'' stores, an
IR helper from its step points and position map, as an IR def does -- so a
helper is the ``<module>'' frame, and the dispatcher is not a frame at all:
BaseException names a helper ``<module>'' and skips the dispatcher
(___isModuleSeamDispatcher___:), in the traceback walk and the live one
alike.  A text helper names its file by its ``___pyFile___'' stamp; an IR
helper's source is Python, which has none, so it is named by the module class,
as every def of the module is: the dispatcher carries a real ``___pyFile___''
store, in code and in its attached source, which
___pythonFileForClassOf___: reads."
Class {
	#name : 'ModuleBodySeam',
	#superclass : 'Object',
	#instVars : [
		'moduleAst',
		'moduleClass',
		'stream',
		'text',
		'chunks',
		'moduleTemps',
		'helpers',
		'splits',
		'overBudget',
		'traceIR',
		'irSnapshots',
		'dispatcherSource',
		'irStatements',
		'refusals',
		'annotateAlone',
		'irFallbacks'
	],
	#category : 'Grail-Parser'
}

{ #category : 'eligibility' }
ModuleBodySeam class >> ___admitsStatement___: aStatement nested: aBoolean [
	"Is aStatement of a kind P4.2 builds through IR at module scope?  break and
	continue only inside a loop it builds (aBoolean), where they can be."

	(self irStatementClasses includes: aStatement class) ifTrue: [^ true].
	^ aBoolean and: [{ BreakAst. ContinueAst } includes: aStatement class]

]

{ #category : 'eligibility' }
ModuleBodySeam class >> ___irRefusalBelow___: aNode [
	"The first construct beneath aNode that keeps its statement on text at
	module scope, or nil.  Depth-first over aNode's instVars, skipping the
	parent back-pointer, as FunctionDefAst >> ___irFirstRefusedChildOf___:locals:
	walks."

	aNode class allInstVarNames doWithIndex: [:nameSym :i |
		nameSym == #parent ifFalse: [
			(self ___irRefusalInValue___: (aNode instVarAt: i)) ifNotNil: [:r | ^ r]]].
	^ nil

]

{ #category : 'eligibility' }
ModuleBodySeam class >> ___irRefusalInValue___: aValue [
	"___irRefusalBelow___:'s step.  What keeps a module statement on text,
	beyond its own predicate, is what P4.3 and P4.4 own:

	  * a nested statement of another kind -- a def or class in an ``if'', a
	    try, a with (``nested:<Kind>'');
	  * a lambda or a comprehension, each a scope -- a frame and a code object
	    -- of its own (``lambda'', ``comprehension'');
	  * a call that reads the CALLING scope -- globals(), locals(), vars(),
	    dir() with no argument, eval(), exec(), super() (``call:<name>'');
	  * yield and await, which module scope rejects anyway (``yield'')."

	| cls fn |
	aValue isNil ifTrue: [^ nil].
	aValue isString ifTrue: [^ nil].
	(aValue isKindOf: SequenceableCollection) ifTrue: [
		aValue do: [:each | (self ___irRefusalInValue___: each) ifNotNil: [:r | ^ r]].
		^ nil].
	(aValue isKindOf: AbstractNode) ifFalse: [^ nil].
	cls := aValue class.
	(aValue isKindOf: StatementAst) ifTrue: [
		(self ___admitsStatement___: aValue nested: true) ifFalse: [
			^ ('nested:' , (importlib ___irCensusKindOf___: aValue)) asSymbol]].
	cls == LambdaAst ifTrue: [^ #'lambda'].
	({ ListCompAst. SetCompAst. DictCompAst. GeneratorExpAst } includes: cls)
		ifTrue: [^ #'comprehension'].
	({ YieldAst. YieldFromAst. AwaitAst } includes: cls) ifTrue: [^ #'yield'].
	cls == CallAst ifTrue: [
		fn := aValue function.
		(fn isKindOf: NameAst) ifTrue: [
			(#('eval' 'exec' 'super') includes: fn id asString) ifTrue: [
				^ ('call:' , fn id asString) asSymbol].
			((#('globals' 'locals' 'vars' 'dir') includes: fn id asString)
				and: [(aValue arguments ifNil: [#()]) isEmpty
				and: [(aValue keywords ifNil: [#()]) isEmpty]])
					ifTrue: [^ ('call:' , fn id asString) asSymbol]]].
	^ self ___irRefusalBelow___: aValue

]

{ #category : 'budget' }
ModuleBodySeam class >> ___limit: anIndex default: anInteger [
	"The budget figure at anIndex of the session's forced limits, or
	anInteger.  See limitsForce:."

	| forced |
	forced := SessionTemps current at: #'GrailModuleSeamLimits' otherwise: nil.
	forced isNil ifTrue: [^ anInteger].
	^ (forced at: anIndex) ifNil: [anInteger]

]

{ #category : 'budget' }
ModuleBodySeam class >> budgetOf: aMethod [
	"{ words. step points. string literals } of aMethod, the three numbers the
	budget limits.  String literals are counted in the method's literal frame,
	which in 4.0 holds its blocks' literals too, and exclude Symbols (selectors
	are not the slots the 8,192 limit counts)."

	| strings |
	strings := 0.
	aMethod literals do: [:lit |
		((lit isKindOf: CharacterCollection) and: [lit isSymbol not])
			ifTrue: [strings := strings + 1]].
	^ { aMethod basicSize. aMethod _numSourceOffsets. strings }

]

{ #category : 'testing' }
ModuleBodySeam class >> failIRBuildsForce: aBoolean [
	"A TEST SEAM: true makes every IR group build of this session raise, so a
	test can watch the group fall back to a text helper written late
	(ModuleBodySeam >> ___installIR:to:); false forgets it."

	aBoolean == true
		ifTrue: [SessionTemps current at: #'GrailModuleSeamFailIR' put: true]
		ifFalse: [SessionTemps current removeKey: #'GrailModuleSeamFailIR' ifAbsent: []]

]

{ #category : 'naming' }
ModuleBodySeam class >> helperPrefix [
	^ '___irModStmt_'

]

{ #category : 'budget' }
ModuleBodySeam class >> irPackFactor [
	"How many characters of generated text one character of a statement's
	Python is counted as, when an IR group is PACKED (plan).  A first guess
	only, as packChars is: the budget check on the generated method holds the
	limit, and a group over it is split."

	^ self ___limit: 6 default: 8

]

{ #category : 'eligibility' }
ModuleBodySeam class >> irRefusalOf: aStatement [
	"nil when aStatement, a statement directly in a module body, is built
	through IR (P4.2); else WHY it is text, as a Symbol: #text for a kind P4.2
	does not build at all (a def, a class, a try...), otherwise the reason a
	statement of a P4.2 kind stays on text -- ___irRefusalInValue___:'s rows,
	then the statement's own IR predicate judged at module scope, with no
	locals, named by the census walk the defs use (FunctionDefAst >>
	___irRefusalIn___:locals:, which reads no state of its receiver).

	Asked in the module body's emit context (ModuleAst >> ___withSeamContextDo:),
	where functionBeingCompiled and classBeingCompiled are nil, so every
	predicate answers for module scope.  Guarded: eligibility never raises."

	(self ___admitsStatement___: aStatement nested: false) ifFalse: [^ #text].
	(aStatement beginPosition isNil
		or: [aStatement endPosition isNil
		or: [aStatement beginLine isNil]]) ifTrue: [^ #'noPosition'].
	^ [(self ___irRefusalBelow___: aStatement) ifNil: [
		(aStatement ___irEligibleStatementLocals___: Set new)
			ifTrue: [nil]
			ifFalse: [(FunctionDefAst new ___irRefusalIn___: aStatement locals: Set new)
				ifNil: [('shape:' , aStatement class name asString) asSymbol]]]]
		on: Error do: [:ex |
			(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
			ex return: #'invariant:predicateRaised']

]

{ #category : 'eligibility' }
ModuleBodySeam class >> irStatementClasses [
	"The statement kinds P4.2 builds through IR at module scope."

	^ { AnnAssignAst. AssertAst. AssignAst. AugAssignAst. DeleteAst. ExprAst.
		ForAst. GlobalAst. IfAst. ImportAst. ImportFromAst. PassAst. RaiseAst. WhileAst }

]

{ #category : 'naming' }
ModuleBodySeam class >> isHelperSelector: aSelectorOrNil [
	"Is this a statement helper's selector, ``___irModStmt_<offset>___''?"

	| s |
	aSelectorOrNil isNil ifTrue: [^ false].
	s := aSelectorOrNil asString.
	^ (s beginsWith: self helperPrefix)
		and: [(s endsWith: '___') and: [s size > (self helperPrefix size + 3)]]

]

{ #category : 'budget' }
ModuleBodySeam class >> limitsForce: anArrayOrNil [
	"A TEST SEAM: { maxWords. maxSteps. maxStrings. packChars. packStatements.
	irPackFactor } for this session, each nil for its default (a shorter Array
	leaves the rest at theirs); nil forgets them.  A test sets small limits to
	make an ordinary fixture split over budget."

	| limits |
	anArrayOrNil isNil ifTrue: [
		^ SessionTemps current removeKey: #'GrailModuleSeamLimits' ifAbsent: []].
	limits := Array new: 6.
	anArrayOrNil doWithIndex: [:each :i | limits at: i put: each].
	SessionTemps current at: #'GrailModuleSeamLimits' put: limits

]

{ #category : 'budget' }
ModuleBodySeam class >> maxSteps [
	"Step points per generated method.  P0.7's frame loss came between 3,727 and
	4,000-odd steps on its code-shaped body; half of that leaves room."

	^ self ___limit: 2 default: 2000

]

{ #category : 'budget' }
ModuleBodySeam class >> maxStrings [
	"String literals per literal frame: half of IR's hard 8,192 (P0.7)."

	^ self ___limit: 3 default: 4000

]

{ #category : 'budget' }
ModuleBodySeam class >> maxWords [
	"Words (basicSize) per generated method: P0.7 lost the frame past about 12k."

	^ self ___limit: 1 default: 8000

]

{ #category : 'instance creation' }
ModuleBodySeam class >> module: aModuleAst class: aModuleClass [
	^ self new setModule: aModuleAst class: aModuleClass

]

{ #category : 'budget' }
ModuleBodySeam class >> packChars [
	"How much generated text a group is first PACKED to, before the budget is
	checked on the method it compiles to.  Only a first guess: the check on the
	generated method is what holds the limit, and a group over it is split."

	^ self ___limit: 4 default: 32000

]

{ #category : 'budget' }
ModuleBodySeam class >> packStatements [
	^ self ___limit: 5 default: 400

]

{ #category : 'budget' }
ModuleBodySeam class >> withinBudget: aMethod [
	| b |
	b := self budgetOf: aMethod.
	^ (b at: 1) <= self maxWords
		and: [(b at: 2) <= self maxSteps
		and: [(b at: 3) <= self maxStrings]]

]

{ #category : 'private' }
ModuleBodySeam >> ___buildIR: aSelector from: firstStmt to: lastStmt [
	"Build statements firstStmt..lastStmt as ONE IR method, install it under
	aSelector in category 'Grail-Module Body', and answer it.

	The method is built as an IR def is (FunctionDefAst >>
	___irMethodBodyCoreOn___:install:): the module source from the first
	statement's first character to the last one's last, verbatim, with the
	``# line <n> file <path>'' trailer the readers of an IR method's slice
	expect, rebased at the first statement's offset, so the position map
	records each node's absolute line and a traceback or f_lineno reads it as
	it reads a def's.  The statements' own emitters do the rest: at module
	scope a name is no local of the builder's, so every load and store goes to
	the module instance, as the text's do."

	| b stmts src begin end slice path meth |
	(SessionTemps current at: #'GrailModuleSeamFailIR' otherwise: false) == true
		ifTrue: [Error signal: 'ModuleBodySeam failIRBuildsForce: a forced IR build failure'].
	stmts := (firstStmt to: lastStmt) collect: [:k | (chunks at: k + 1) at: 1].
	src := moduleAst source.
	begin := stmts first beginPosition.
	end := (stmts last endPosition ifNil: [src size]) min: src size.
	b := PyMethodIRBuilder class: moduleClass selector: aSelector asSymbol env: 1.
	slice := src copyFrom: begin to: end.
	slice last == Character lf ifFalse: [slice lf].
	path := moduleAst path ifNil: [AbstractNode ___sourceFilename___].
	slice add: '# line '; add: stmts first beginLine asString; add: ' file '; add: path asString; lf.
	b sourceString: slice fileName: AbstractNode ___sourceFilename___ line: stmts first beginLine.
	b sourceBase: begin.
	moduleAst ___withSeamContextDo: [
		stmts do: [:each | each ___emitIRStatementOn___: b]].
	b add: (b return: b selfNode).
	meth := b install.
	[moduleClass addCategory: 'Grail-Module Body' environmentId: 1]
		on: Error do: [:ex | ex return: nil].
	moduleClass moveMethod: aSelector asSymbol toCategory: 'Grail-Module Body' environmentId: 1.
	traceIR == true ifTrue: [
		irSnapshots add: aSelector -> ('built through IR from ' , slice)].
	^ meth

]

{ #category : 'private' }
ModuleBodySeam >> ___chunkIndicesFrom: firstStmt to: lastStmt [
	"Chunk indices for statements firstStmt..lastStmt (1-based); 0..0 is the
	annotate store alone.  Chunk 1, the annotate store, rides with the FIRST
	statement when that is text: it has to run before the body, as it did at
	the head of the one big method.  When the first statement is built through
	IR the store has a text helper of its own, first (plan)."

	firstStmt = 0 ifTrue: [^ #(1)].
	^ ((firstStmt = 1 and: [annotateAlone ~~ true]) ifTrue: [1] ifFalse: [firstStmt + 1])
		to: lastStmt + 1

]

{ #category : 'private' }
ModuleBodySeam >> ___compile: aSelector from: firstStmt to: lastStmt [
	"Compile the TEXT helper for statements firstStmt..lastStmt under aSelector
	and answer { source. method }."

	| src meth |
	src := self sourceFor: aSelector from: firstStmt to: lastStmt.
	importlib ___irCensusOn___ ifTrue: [
		importlib ___irCensusText: src kind: 'moduleBody'].
	[moduleClass compileMethod: src
		dictionaries: importlib ___grailCompileSymbolList___
		category: 'Grail-Module Body'
		environmentId: 1]
			on: CompileWarning do: [:ex | ex resume].
	meth := moduleClass compiledMethodAt: aSelector environmentId: 1 otherwise: nil.
	meth isNil ifTrue: [
		Error signal: 'module statement helper did not compile: ' , aSelector asString].
	traceIR == true ifTrue: [
		irSnapshots add: aSelector -> (System __sessionStateAt: 19) printString].
	^ { src. meth }

]

{ #category : 'private' }
ModuleBodySeam >> ___emitTextFrom: firstStmt to: lastStmt [
	"Write statements firstStmt..lastStmt, which were left to IR, as text at
	the end of the stream, in order, and make them text statements: an IR
	build that failed, or the one text method a failed seam falls back to."

	| base late |
	base := text size.
	moduleAst ___withSeamContextDo: [
		firstStmt to: lastStmt do: [:k |
			| stmt c |
			stmt := (chunks at: k + 1) at: 1.
			(irStatements includes: stmt) ifTrue: [
				c := moduleAst ___emitSeamStatement___: stmt on: stream.
				chunks at: k + 1 put: { c at: 1. (c at: 2) + base. (c at: 3) + base.
					c at: 4. c at: 5. base }.
				irStatements remove: stmt]]].
	"AppendStream >> contents answers the collection WITHOUT copying and starts
	the stream on a new, empty one, so what this wrote begins at position 0 of
	it -- text and map offsets alike.  The text is appended to what the first
	emit answered, and each chunk carries the BIAS its map entries need
	(sourceFor:chunks:)."
	late := stream contents.
	late isEmpty ifFalse: [text := text , late]

]

{ #category : 'private' }
ModuleBodySeam >> ___install: firstStmt to: lastStmt [
	"Compile one group, and split it in half while the method it compiles to is
	over budget.  The first half reuses the group's selector, so the over-budget
	method is replaced rather than left behind.  A group of IR statements is
	built through IR (___installIR:to:)."

	| sel pair mid |
	(firstStmt > 0 and: [self ___isIR: firstStmt]) ifTrue: [
		^ self ___installIR: firstStmt to: lastStmt].
	sel := self selectorForStatement: firstStmt.
	pair := self ___compile: sel from: firstStmt to: lastStmt.
	(self class withinBudget: (pair at: 2)) ifFalse: [
		firstStmt < lastStmt ifTrue: [
			splits := splits + 1.
			mid := firstStmt + ((lastStmt - firstStmt + 1) // 2) - 1.
			self ___install: firstStmt to: mid.
			^ self ___install: mid + 1 to: lastStmt].
		overBudget := overBudget + 1].
	helpers add: { sel. pair at: 1. pair at: 2. firstStmt. lastStmt. #text }

]

{ #category : 'private' }
ModuleBodySeam >> ___installIR: firstStmt to: lastStmt [
	"___install:to: for a group of IR statements: build it, and split it in
	half while the generated method is over budget.  A build that raises is a
	FALLBACK for the group alone: its statements are written as text and
	compiled as a text helper, counted (importlib >>
	___irNoteModuleStatementsFallback___:error:), and in strict mode the error
	goes on to the seam's own handler, which raises."

	| sel meth mid |
	sel := self selectorForStatement: firstStmt.
	meth := [self ___buildIR: sel from: firstStmt to: lastStmt]
		on: Error do: [:ex |
			(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
			importlib ___irStrict___ ifTrue: [ex pass].
			irFallbacks := irFallbacks + 1.
			importlib ___irNoteModuleStatementsFallback___: moduleClass name error: ex.
			ex return: nil].
	meth isNil ifTrue: [
		self ___emitTextFrom: firstStmt to: lastStmt.
		^ self ___install: firstStmt to: lastStmt].
	(self class withinBudget: meth) ifFalse: [
		firstStmt < lastStmt ifTrue: [
			splits := splits + 1.
			mid := firstStmt + ((lastStmt - firstStmt + 1) // 2) - 1.
			self ___installIR: firstStmt to: mid.
			^ self ___installIR: mid + 1 to: lastStmt].
		overBudget := overBudget + 1].
	helpers add: { sel. nil. meth. firstStmt. lastStmt. #ir }

]

{ #category : 'private' }
ModuleBodySeam >> ___isIR: k [
	"Is statement k (1-based) built through IR?"

	^ irStatements includes: ((chunks at: k + 1) at: 1)

]

{ #category : 'private' }
ModuleBodySeam >> ___temps: aString mentions: aTemp [
	"Does aString use the helper temp aTemp (``___t_N'') -- as itself, not as the
	prefix of ``___t_N0''?"

	| i next |
	i := 1.
	[i := aString indexOfSubCollection: aTemp startingAt: i.
	 i > 0] whileTrue: [
		next := i + aTemp size.
		(next > aString size or: [(aString at: next) isDigit not]) ifTrue: [^ true].
		i := i + 1].
	^ false

]

{ #category : 'building' }
ModuleBodySeam >> dispatcherSource [
	"The Smalltalk the IR ``initialize'' was built from, attached to it as its
	source: what a reader of the method sees, and the ``___pyFile___'' stamp
	BaseException class >> ___pythonFileForClassOf___: reads every def's file
	from."

	^ dispatcherSource

]

{ #category : 'building' }
ModuleBodySeam >> emit [
	"Judge every statement (irRefusalOf:), then write the TEXT ones once
	(ModuleAst >> ___emitSeamChunksOn___:skipping:).  The IR ones are built
	when their group is installed."

	| stmts |
	stmts := moduleAst body body.
	refusals := Array new: stmts size.
	irStatements := IdentitySet new.
	importlib ___irModuleStatementsEnabled___ ifTrue: [
		moduleAst ___withSeamContextDo: [
			stmts doWithIndex: [:each :k |
				| r |
				r := self class irRefusalOf: each.
				refusals at: k put: r.
				r isNil ifTrue: [irStatements add: each]]]].
	stream := PrettyWriteStream on: Unicode7 new.
	stream markStartOfMethod.
	chunks := moduleAst ___emitSeamChunksOn___: stream skipping: irStatements.
	text := stream contents.
	moduleTemps := (moduleAst body variables ifNil: [#()])
		select: [:each | each beginsWith: '___t_'].
	moduleTemps := (moduleTemps asSortedCollection: [:a :b | a asString <= b asString]) asArray.
	^ self

]

{ #category : 'accessing' }
ModuleBodySeam >> helpers [
	"{ selector. source. method. firstStatement. lastStatement. kind } per
	helper, in the order ``initialize'' sends them.  kind is #text or #ir; an
	IR helper's source is nil (its method's attached source is its Python)."

	^ helpers

]

{ #category : 'building' }
ModuleBodySeam >> installDispatcher [
	"Build ``initialize'' through IR: the seam's marker temp, the ``___pyFile___''
	stamp, a send per helper in order, ``^ self''.  No position map and no
	Python line, by design -- the helpers are the frame (see the class comment)."

	| b seamLeaf fileLeaf file src lf |
	file := AbstractNode ___sourceFilename___.
	lf := String with: Character lf.
	src := PrettyWriteStream on: Unicode7 new.
	src nextPutAll: 'initialize'; nextPutAll: lf;
		nextPutAll: '	"The module body''s statement seam (ModuleBodySeam): built through IR."'; nextPutAll: lf;
		nextPutAll: '	| ___grailModuleSeam___ ___pyFile___ |'; nextPutAll: lf;
		nextPutAll: '	___grailModuleSeam___ := true.'; nextPutAll: lf;
		nextPutAll: '	___pyFile___ := '.
	AbstractNode emitSourceFilenameLiteralOn: src.
	src nextPut: $.; nextPutAll: lf.
	b := PyMethodIRBuilder class: moduleClass selector: #initialize env: 1.
	seamLeaf := b tempNamed: #'___grailModuleSeam___'.
	b add: (b assign: seamLeaf from: b trueLit).
	fileLeaf := b tempNamed: #'___pyFile___'.
	b add: (b assign: fileLeaf from: (b obj: file)).
	helpers do: [:h |
		src nextPutAll: '	self '; nextPutAll: (h at: 1); nextPut: $.; nextPutAll: lf.
		b add: (b send: (h at: 1) asSymbol to: b selfNode with: #())].
	src nextPutAll: '	^ self'; nextPutAll: lf.
	b add: (b return: b selfNode).
	dispatcherSource := src contents.
	b sourceString: dispatcherSource fileName: file line: 1.
	b install.
	[moduleClass addCategory: 'Grail-Module Body' environmentId: 1]
		on: Error do: [:ex | ex return: nil].
	moduleClass moveMethod: #initialize toCategory: 'Grail-Module Body' environmentId: 1.
	^ self

]

{ #category : 'building' }
ModuleBodySeam >> installHelpers [
	"Pack the statements into groups, then compile or build each under the
	budget."

	self plan do: [:range | self ___install: (range at: 1) to: (range at: 2)].
	^ self

]

{ #category : 'accessing' }
ModuleBodySeam >> irFallbacks [
	"How many IR groups failed to build and were compiled as text instead."

	^ irFallbacks

]

{ #category : 'accessing' }
ModuleBodySeam >> irSnapshots [
	"selector -> the compiled IR of that helper, when traceIR: was set."

	^ irSnapshots

]

{ #category : 'accessing' }
ModuleBodySeam >> moduleStatements [
	"The module body's statements, in order: statement k is chunk k + 1."

	^ moduleAst body body

]

{ #category : 'building' }
ModuleBodySeam >> monolithicSource [
	"The whole body as ONE text ``initialize'', from the same emit -- what a
	failed seam falls back to, so a text statement is never emitted twice.  The
	statements left to IR are written as text first, at the end of the stream,
	and the method takes every statement's text in source order."

	chunks size <= 1 ifTrue: [^ self sourceFor: 'initialize' chunks: (1 to: chunks size)].
	self ___emitTextFrom: 1 to: chunks size - 1.
	^ self sourceFor: 'initialize' chunks: (1 to: chunks size)

]

{ #category : 'accessing' }
ModuleBodySeam >> overBudget [
	^ overBudget

]

{ #category : 'building' }
ModuleBodySeam >> plan [
	"The first grouping, as { firstStatement. lastStatement } pairs: every class
	statement alone; the other statements in runs of ONE kind -- built through
	IR, or text -- packed under packChars of generated text and packStatements
	statements (an IR statement counted as irPackFactor characters per
	character of its Python).  The budget check in ___install:to: is what holds
	the limit; this only keeps the number of rebuilds low.

	When the first statement is built through IR and the module stores an
	annotate function or an annotations dict before its body (chunk 1), that
	store is a text helper of its own, first: { 0. 0 }."

	| groups n start size count kind flush anno |
	groups := OrderedCollection new.
	n := chunks size - 1.
	anno := chunks at: 1.
	annotateAlone := n >= 1 and: [(self ___isIR: 1) and: [(anno at: 3) > (anno at: 2)]].
	annotateAlone ifTrue: [groups add: #(0 0)].
	start := nil.
	size := 0.
	count := 0.
	kind := nil.
	flush := [:last |
		start notNil ifTrue: [groups add: { start. last }].
		start := nil. size := 0. count := 0. kind := nil].
	1 to: n do: [:k |
		| chunk stmt len thisKind |
		chunk := chunks at: k + 1.
		stmt := chunk at: 1.
		(self ___isIR: k)
			ifTrue: [
				thisKind := #ir.
				len := (stmt endPosition - stmt beginPosition + 1) * self class irPackFactor]
			ifFalse: [
				thisKind := #text.
				len := (chunk at: 3) - (chunk at: 2)].
		(stmt isKindOf: ClassDefAst)
			ifTrue: [
				flush value: k - 1.
				groups add: { k. k }]
			ifFalse: [
				(start notNil and: [thisKind ~~ kind
					or: [size + len > self class packChars
					or: [count >= self class packStatements]]])
						ifTrue: [flush value: k - 1].
				start isNil ifTrue: [start := k. kind := thisKind].
				size := size + len.
				count := count + 1]].
	flush value: n.
	^ groups

]

{ #category : 'accessing' }
ModuleBodySeam >> refusals [
	"Per statement, in order: nil when it was judged buildable through IR, else
	why not (ModuleBodySeam class >> irRefusalOf:).  nil throughout when the
	module statements are not built through IR at all."

	^ refusals

]

{ #category : 'building' }
ModuleBodySeam >> removeHelpers [
	"Remove every helper this build compiled: a seam that failed after its emit
	leaves the class as it found it, and importlib compiles the one text method
	(monolithicSource) instead."

	helpers isNil ifTrue: [^ self].
	helpers do: [:h |
		[moduleClass @env1:___removeSelector: (h at: 1) asSymbol environmentId: 1]
			on: Error do: [:ex | ex return: nil]].
	^ self

]

{ #category : 'naming' }
ModuleBodySeam >> selectorForStatement: k [
	"``___irModStmt_<offset>___'', the offset being statement k's position in the
	module source -- unique within the module, and stable for a statement no
	edit moved, so an unchanged module rebuilds the same selectors.  k = 0 is
	the annotate store's own helper, ``___irModStmt_0___'': no statement
	starts before the first character."

	| stmt pos sel |
	k = 0 ifTrue: [^ self class helperPrefix , '0___'].
	stmt := (chunks at: k + 1) at: 1.
	pos := [stmt beginPosition] on: Error do: [:ex | ex return: nil].
	pos isNil ifTrue: [pos := 'n' , k printString].
	sel := self class helperPrefix , pos asString , '___'.
	"Statements the parser SYNTHESISES share their statement's offset: a PEP 695
	``class C[T]'' is a def, an assignment and a del, all at the class's.  When
	two of them start helpers -- an IR one after a text one (P4.2), or the two
	halves of a split group -- the later one is told apart by its index, or it
	would replace the earlier helper and the dispatcher would run it twice.
	The first half of a split is not yet a helper when the second is named, so
	it keeps the plain selector it replaces."
	(helpers anySatisfy: [:h | (h at: 1) = sel]) ifTrue: [
		sel := self class helperPrefix , pos asString , '_' , k printString , '___'].
	^ sel

]

{ #category : 'initialization' }
ModuleBodySeam >> setModule: aModuleAst class: aModuleClass [
	moduleAst := aModuleAst.
	moduleClass := aModuleClass.
	helpers := OrderedCollection new.
	splits := 0.
	overBudget := 0.
	irFallbacks := 0.
	irSnapshots := OrderedCollection new.
	irStatements := IdentitySet new.
	^ self

]

{ #category : 'building' }
ModuleBodySeam >> sourceFor: aSelector chunks: someIndices [
	"The text method for the chunks at someIndices, in that order: the header
	the one big ``initialize'' had -- selector, ``<grailPython>'', the temps,
	the ``___pyFile___'' stamp -- then the chunks' text, then their position map
	moved to this method's offsets.  The temps are ``___curPos___'',
	``___pyFile___'' and the module's helper temps (``___t_N'') the text
	mentions.

	Chunks next to each other in the stream are one piece, so a group whose
	statements were all written in the first emit is ONE slice and one map
	range, as in P4.1; a statement written later (___emitTextFrom:to:) is a
	piece of its own, with its own shift: its chunk's sixth element is the bias
	its map entries need, since they count from where the later write began."

	| runs body hdr lf temps segments acc |
	runs := OrderedCollection new.
	someIndices do: [:i |
		| c bias |
		c := chunks at: i.
		bias := c size >= 6 ifTrue: [c at: 6] ifFalse: [0].
		(runs notEmpty and: [(runs last at: 2) = (c at: 2) and: [(runs last at: 5) = bias]])
			ifTrue: [runs last at: 2 put: (c at: 3); at: 4 put: (c at: 5)]
			ifFalse: [runs add: { c at: 2. c at: 3. c at: 4. c at: 5. bias }]].
	body := nil.
	runs do: [:r |
		| piece |
		piece := text copyFrom: (r at: 1) + 1 to: (r at: 2).
		body := body isNil ifTrue: [piece] ifFalse: [body , piece]].
	body isNil ifTrue: [body := ''].
	lf := Character lf.
	temps := (moduleTemps select: [:t | self ___temps: body mentions: t]) asOrderedCollection.
	temps add: '___curPos___'; add: '___pyFile___'.
	hdr := PrettyWriteStream on: Unicode7 new.
	hdr nextPutAll: aSelector asString; nextPut: lf.
	moduleAst ___emitPythonPragmaOn___: hdr.
	hdr nextPut: $|.
	temps do: [:each | hdr space; nextPutAll: each].
	hdr nextPutAll: ' |'; nextPut: lf.
	hdr nextPutAll: '___pyFile___ := '.
	AbstractNode emitSourceFilenameLiteralOn: hdr.
	hdr nextPutAll: '.'; nextPut: lf.
	hdr := hdr contents.
	segments := OrderedCollection new.
	acc := hdr size.
	runs do: [:r |
		segments add: { (r at: 3) + 1. r at: 4. acc - (r at: 1) + (r at: 5) }.
		acc := acc + ((r at: 2) - (r at: 1))].
	^ hdr , body , (stream mapCommentSegments: segments)

]

{ #category : 'building' }
ModuleBodySeam >> sourceFor: aSelector from: firstStmt to: lastStmt [
	"The text method for statements firstStmt..lastStmt (sourceFor:chunks:)."

	^ self sourceFor: aSelector chunks: (self ___chunkIndicesFrom: firstStmt to: lastStmt)

]

{ #category : 'accessing' }
ModuleBodySeam >> splits [
	^ splits

]

{ #category : 'accessing' }
ModuleBodySeam >> traceIR: aBoolean [
	traceIR := aBoolean

]
