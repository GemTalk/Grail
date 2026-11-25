"The module body as several methods: the STATEMENT SEAM, step P4.1 of the
IR-only codegen plan.

A module's env-1 ``initialize'' used to be one text method holding every
module statement.  Under the seam it is built through PyMethodIRBuilder and
is nothing but a list of sends, ``self ___irModStmt_<offset>___'', one per
HELPER; each helper holds a run of consecutive statements, and each class
statement has a helper of its own.  A method cannot mix IR and text, but a
module can mix methods, so a helper whose statements IR cannot build yet is a
text helper -- which in P4.1 is every helper; P4.2/P4.3 build them through IR.

WHY SEVERAL METHODS, AND WHY FOR GOOD.  P0.7 measured two limits that are per
METHOD: past about 12k words of code a method loses its traceback frame (the
kernel cannot read its debug info), and an IR method holds at most 8,192
string-literal slots.  The largest module bodies are 13k-46k words.  So the
split is the end state, and every group is checked against a BUDGET on the
method actually generated -- words (basicSize), step points
(_numSourceOffsets) and string literals in its literal frame, which in 4.0 its
blocks share -- and split in half when it is over.  One statement over budget
cannot be split here; it is kept (it was in the one big method before) and
counted, ``mh:overBudget''.

EMITTED ONCE, CUT MANY TIMES.  The statements are written into one stream by
ModuleAst >> ___emitSeamChunksOn___:, which records each one's text range and
position-map range; a helper is a slice of that text under its own header, with
its own slice of the map shifted to its own offsets.  Splitting a group re-cuts
the slices and never re-runs codegen, whose side effects (def ids, sequence
numbers) must happen once.

THE FRAMES.  CPython has one ``<module>'' frame.  The helper running a
statement knows its line (its ``___curPos___'' stores) and its file (the
``___pyFile___'' stamp), so a helper is the ``<module>'' frame, and the
dispatcher is not a frame at all: BaseException names a helper ``<module>''
and skips the dispatcher (___isModuleSeamDispatcher___:), in the traceback
walk and the live one alike.  The dispatcher still carries a real
``___pyFile___'' store, in code and in its attached source, because
___pythonFileForClassOf___: reads every def's filename from ``initialize''."
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
		'dispatcherSource'
	],
	#category : 'Grail-Parser'
}

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

{ #category : 'naming' }
ModuleBodySeam class >> helperPrefix [
	^ '___irModStmt_'

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
	"A TEST SEAM: { maxWords. maxSteps. maxStrings. packChars. packStatements }
	for this session, each nil for its default; nil forgets them.  A test sets
	small limits to make an ordinary fixture split over budget."

	anArrayOrNil isNil
		ifTrue: [SessionTemps current removeKey: #'GrailModuleSeamLimits' ifAbsent: []]
		ifFalse: [SessionTemps current at: #'GrailModuleSeamLimits' put: anArrayOrNil]

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
ModuleBodySeam >> ___chunkRangeFrom: firstStmt to: lastStmt [
	"Chunk indices for statements firstStmt..lastStmt (1-based).  Chunk 1 is the
	annotate store, which rides with the FIRST statement: it has to run before
	the body, as it did at the head of the one big method."

	^ { firstStmt = 1 ifTrue: [1] ifFalse: [firstStmt + 1]. lastStmt + 1 }

]

{ #category : 'private' }
ModuleBodySeam >> ___compile: aSelector from: firstStmt to: lastStmt [
	"Compile the helper for statements firstStmt..lastStmt under aSelector and
	answer { source. method }."

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
ModuleBodySeam >> ___install: firstStmt to: lastStmt [
	"Compile one group, and split it in half while the method it compiles to is
	over budget.  The first half reuses the group's selector, so the over-budget
	method is replaced rather than left behind."

	| sel pair mid |
	sel := self selectorForStatement: firstStmt.
	pair := self ___compile: sel from: firstStmt to: lastStmt.
	(self class withinBudget: (pair at: 2)) ifFalse: [
		firstStmt < lastStmt ifTrue: [
			splits := splits + 1.
			mid := firstStmt + ((lastStmt - firstStmt + 1) // 2) - 1.
			self ___install: firstStmt to: mid.
			^ self ___install: mid + 1 to: lastStmt].
		overBudget := overBudget + 1].
	helpers add: { sel. pair at: 1. pair at: 2. firstStmt. lastStmt }

]

{ #category : 'private' }
ModuleBodySeam >> ___sliceFrom: firstStmt to: lastStmt [
	"{ text. startPosition. mapStart. mapEnd } for statements firstStmt..lastStmt."

	| range first last |
	range := self ___chunkRangeFrom: firstStmt to: lastStmt.
	first := chunks at: (range at: 1).
	last := chunks at: (range at: 2).
	^ { text copyFrom: (first at: 2) + 1 to: (last at: 3).
		first at: 2.
		first at: 4.
		last at: 5 }

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
	"Write every statement once (ModuleAst >> ___emitSeamChunksOn___:)."

	stream := PrettyWriteStream on: Unicode7 new.
	stream markStartOfMethod.
	chunks := moduleAst ___emitSeamChunksOn___: stream.
	text := stream contents.
	moduleTemps := (moduleAst body variables ifNil: [#()])
		select: [:each | each beginsWith: '___t_'].
	moduleTemps := (moduleTemps asSortedCollection: [:a :b | a asString <= b asString]) asArray.
	^ self

]

{ #category : 'accessing' }
ModuleBodySeam >> helpers [
	"{ selector. source. method. firstStatement. lastStatement } per helper, in
	the order ``initialize'' sends them."

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
	"Pack the statements into groups, then compile each under the budget."

	self plan do: [:range | self ___install: (range at: 1) to: (range at: 2)].
	^ self

]

{ #category : 'accessing' }
ModuleBodySeam >> irSnapshots [
	"selector -> the compiled IR of that helper, when traceIR: was set."

	^ irSnapshots

]

{ #category : 'building' }
ModuleBodySeam >> monolithicSource [
	"The whole body as ONE text ``initialize'', cut from the same emit -- what a
	failed seam falls back to, so the body is never emitted twice."

	^ chunks size <= 1
		ifTrue: [self sourceFor: 'initialize' from: 1 to: 0]
		ifFalse: [self sourceFor: 'initialize' from: 1 to: chunks size - 1]

]

{ #category : 'accessing' }
ModuleBodySeam >> overBudget [
	^ overBudget

]

{ #category : 'building' }
ModuleBodySeam >> plan [
	"The first grouping, as { firstStatement. lastStatement } pairs: every class
	statement alone, the other statements packed in runs under packChars of
	generated text and packStatements statements.  The budget check in
	___install:to: is what holds the limit; this only keeps the number of
	recompiles low."

	| groups n start size count flush |
	groups := OrderedCollection new.
	n := chunks size - 1.
	start := nil.
	size := 0.
	count := 0.
	flush := [:last |
		start notNil ifTrue: [groups add: { start. last }].
		start := nil. size := 0. count := 0].
	1 to: n do: [:k |
		| chunk len |
		chunk := chunks at: k + 1.
		len := (chunk at: 3) - (chunk at: 2).
		((chunk at: 1) isKindOf: ClassDefAst)
			ifTrue: [
				flush value: k - 1.
				groups add: { k. k }]
			ifFalse: [
				(start notNil and: [size + len > self class packChars
					or: [count >= self class packStatements]])
						ifTrue: [flush value: k - 1].
				start isNil ifTrue: [start := k].
				size := size + len.
				count := count + 1]].
	flush value: n.
	^ groups

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
	edit moved, so an unchanged module rebuilds the same selectors."

	| stmt pos |
	stmt := (chunks at: k + 1) at: 1.
	pos := [stmt beginPosition] on: Error do: [:ex | ex return: nil].
	pos isNil ifTrue: [pos := 'n' , k printString].
	^ self class helperPrefix , pos asString , '___'

]

{ #category : 'initialization' }
ModuleBodySeam >> setModule: aModuleAst class: aModuleClass [
	moduleAst := aModuleAst.
	moduleClass := aModuleClass.
	helpers := OrderedCollection new.
	splits := 0.
	overBudget := 0.
	irSnapshots := OrderedCollection new.
	^ self

]

{ #category : 'building' }
ModuleBodySeam >> sourceFor: aSelector from: firstStmt to: lastStmt [
	"The text method for statements firstStmt..lastStmt: the header the one big
	``initialize'' had -- selector, ``<grailPython>'', the temps, the
	``___pyFile___'' stamp -- then the slice, then the slice's position map moved
	to this method's offsets.  The temps are ``___curPos___'', ``___pyFile___''
	and the module's helper temps (``___t_N'') this slice mentions."

	| slice hdr lf temps |
	slice := lastStmt < firstStmt
		ifTrue: [{ ''. 0. 0. 0 }]
		ifFalse: [self ___sliceFrom: firstStmt to: lastStmt].
	lf := Character lf.
	temps := (moduleTemps select: [:t | self ___temps: (slice at: 1) mentions: t]) asOrderedCollection.
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
	^ hdr , (slice at: 1)
		, (stream mapCommentFrom: (slice at: 3) + 1 to: (slice at: 4)
			shiftedBy: hdr size - (slice at: 2))

]

{ #category : 'accessing' }
ModuleBodySeam >> splits [
	^ splits

]

{ #category : 'accessing' }
ModuleBodySeam >> traceIR: aBoolean [
	traceIR := aBoolean

]
