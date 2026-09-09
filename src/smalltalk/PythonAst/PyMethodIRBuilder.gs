! PyMethodIRBuilder: a thin layer over GemStone's GsCompilerIRNode builder API,
! used by the direct-to-IR codegen path (GRAIL_IR_CODEGEN).  It is the production
! sibling of experiments/ir/PyIRBuilder.gs: same shape, but it resolves the
! GsCom* node classes through the GsCompilerClasses dictionary (they are NOT on
! the runtime symbol list) and it talks to importlib for the compile symbol list.
!
! An AST walker drives it: `class:selector:env:` opens a method, `argNamed:` /
! `tempNamed:` declare parameters and locals, `fileName:source:` attaches the
! Python text, `at:` sets the current 1-based Python character offset that is
! stamped onto every node built after it, node constructors build expression /
! statement nodes, `add:` appends a statement, and `install` generates the
! GsNMethod (primitive 679) and stores it in the target class's env-1 method
! dictionary.
!
! Only the subset the first IR cut needs is wired here (literals, locals,
! returns); it grows as FunctionDefAst>>___irEligible___ widens.

! ------------------- Class definition for PyMethodIRBuilder
expectvalue /Class
doit
Object subclass: 'PyMethodIRBuilder'
	instVarNames: #(methNode targetClass env curOffset locals sourceBase blockStack lexLevel loopStack handlerExStack genLeaf guardedLocals nestedFnDepth closureStack positionMap attachedSource pendingPos)
	classVars: #()
	classInstVars: #()
	poolDictionaries: #()
	inDictionary: PythonAst
	options: #()
%

! ------------------- Remove existing behavior from PyMethodIRBuilder
removeallmethods PyMethodIRBuilder
removeallclassmethods PyMethodIRBuilder

set compile_env: 0

category: 'private'
classmethod: PyMethodIRBuilder
node: aSymbol
	"Resolve a GsCom* node class by name -- they live in the GsCompilerClasses
	dictionary (in Globals) but are NOT on the runtime symbol list, so a bare
	reference would not compile."

	^ GsCompilerClasses at: aSymbol
%

category: 'instance creation'
classmethod: PyMethodIRBuilder
class: aClass selector: aSelector env: anEnvId
	^ self new initClass: aClass selector: aSelector env: anEnvId
%

category: 'capability'
classmethod: PyMethodIRBuilder
supportedOnThisPlatform
	"Answer whether the direct-to-IR path can actually build methods here.  The
	builder drives the kernel GsCom* node classes (via GsCompilerClasses) and
	GsNMethod>>generateFromIR: (primitive 679); both are 4.0+ kernel machinery.
	On 3.7.x the GsCom* node classes exist but their instance-variable layout
	differs -- e.g. allInstVarNames lacks #selector/#envFlags, so the builder's
	`instVarAt: (indexOf: #selector) put:` becomes `instVarAt: 0 put:` and raises.
	This builds a throwaway ``^ 42'' method and generates it (primitive 679)
	WITHOUT installing it anywhere -- no method-dictionary mutation, no side
	effect -- and answers true only if that yields a real GsNMethod.  Any failure
	(the ivar-layout raise on 3.7, a missing selector, a generation error) answers
	false, so the caller keeps the text path.  importlib caches the result per
	session; this need run only once."

	^ [| b meth |
		b := self class: Object selector: #'___irCapabilityProbe___' env: 1.
		b add: (b return: (b obj: 42)).
		meth := b generatedMethod.
		meth isKindOf: GsNMethod]
			on: Error do: [:e | false]
%

category: 'initialization'
method: PyMethodIRBuilder
initClass: aClass selector: aSelector env: anEnvId
	| mnClass |
	mnClass := PyMethodIRBuilder node: #GsComMethNode.
	methNode := mnClass newSmalltalk.
	methNode instVarAt: (mnClass allInstVarNames indexOf: #selector)
		put: aSelector.
	methNode class: aClass.
	"envInfo = bodyEnv | (selectorEnv << 8); both are anEnvId (comparse.ht)."
	methNode instVarAt: (mnClass allInstVarNames indexOf: #envInfo)
		put: (anEnvId bitOr: (anEnvId bitShift: 8)).
	methNode fileName: 'PyMethodIRBuilder' source: nil.
	targetClass := aClass.
	env := anEnvId.
	curOffset := nil.
	locals := IdentityKeyValueDictionary new.
	sourceBase := 1.
	"statement context: methNode, then nested GsComBlockNodes; add: appends to
	the innermost.  lexLevel and loopStack drive block nesting + break/continue."
	blockStack := OrderedCollection with: methNode.
	lexLevel := 0.
	loopStack := OrderedCollection new.
	handlerExStack := OrderedCollection new.
	genLeaf := nil.
	nestedFnDepth := 0.
	closureStack := OrderedCollection new.
	^ self
%

category: 'building'
method: PyMethodIRBuilder
fileName: aName source: aString
	"Attach the Python source text; node srcOffsets index into it.  The method's
	own source begins at offset 1 of this string, so the methNode's srcOffset MUST
	be 1: codegen's initSrcOffsets reads it as startSrcOffset and rebases every
	step point by adjustSrcOffset(ofs) = ofs - startSrcOffset + 1.  A nil methNode
	srcOffset is read as garbage and mangles every send/return line."

	| mnClass |
	mnClass := PyMethodIRBuilder node: #GsComMethNode.
	attachedSource := aString.
	methNode fileName: aName source: aString.
	aString ifNotNil: [
		methNode instVarAt: (mnClass allInstVarNames indexOf: #srcOffset) put: 1.
		methNode instVarAt: (mnClass allInstVarNames indexOf: #endSrcOffset)
			put: aString size].
	^ self
%

category: 'building'
method: PyMethodIRBuilder
firstLine: aLineNumber
	"The absolute (1-based) module line the attached source slice starts on --
	the def's beginLine.  codegen's initSrcOffsets seeds firstSrcLine from the
	methNode's lineNumber, then reports each step point as firstSrcLine + the
	newlines before its offset, so this is what makes _lineNumberForIp: answer
	ABSOLUTE module lines instead of slice-relative ones."

	methNode lineNumber: aLineNumber.
	^ self
%

category: 'building'
method: PyMethodIRBuilder
sourceBase: aModuleOffset
	"The absolute (module-source) offset at which the method's attached source
	slice begins.  ``at:'' is then given ABSOLUTE node positions and rebases them
	into the slice, so callers pass a node's beginPosition verbatim.  Default 1
	means offsets are already slice-relative."

	sourceBase := aModuleOffset.
	^ self
%

category: 'building'
method: PyMethodIRBuilder
at: aModuleOffset
	"Set the current Python position from a node's ABSOLUTE beginPosition (into
	the module source).  Rebased into the attached source slice by sourceBase, so
	it lines up with methNode srcOffset = 1 and the VM's adjustSrcOffset."

	curOffset := ((aModuleOffset - sourceBase + 1) max: 1).
	^ self
%

category: 'building'
method: PyMethodIRBuilder
atNode: aNode
	"Set the current Python position from aNode AND record aNode's extent in the
	position map.  The stamping half is exactly ``at: aNode beginPosition''; the
	recording half is what lets a traceback name the OPERATION rather than the
	statement.

	WHY THE EXTENT AND NOT JUST THE START.  The VM keeps one source offset per
	step point (``_numSourceOffsets''/``_sourceOffsetsAt:''), and ``stamp:''
	fills it with the offset set here -- so an ip resolves to a Python OFFSET
	natively, with no Smalltalk-offset half to cross.  But an offset alone
	cannot name a node: nested nodes routinely share a beginPosition.  Measured
	on ``return [(1, 2 + 1 / 0)][0]'', the seven step points carry offsets for
	the division, the addition, the tuple, the list AND the subscript -- and the
	last two are the same offset, because both begin at the same ``[''.  So the
	map records each node's RANGE, and the reader takes the smallest range
	containing the step point's offset, which is the innermost node.  That is
	precisely the rule BaseException>>___mapSpanForMethod___:ip: already applies
	to the text path's map, so this table is read by that method UNCHANGED.

	FLAT, six SmallIntegers per entry rather than a six-element Array per node,
	for the reason the text's map records: SmallIntegers are immediate, so the
	whole table allocates once per method instead of once per node."

	| start endPos lead stampAt |
	aNode isNil ifTrue: [^ self].
	"AN F-STRING REPLACEMENT FIELD IS PARSED BY A CHILD PARSER over ``(expr)''
	 alone, so every node inside it claims line 1, column 1 -- see
	 AbstractNode>>___markFragmentPositions___.  Such a node must neither be
	 recorded (a line-1 range nests inside the true one and would win the
	 innermost contest, blaming line 1 of the file) nor STAMPED (a step point at
	 offset 1 would put the frame on line 1 outright, which is worse than the
	 coarse answer).  Leaving the enclosing position in place degrades to the
	 whole f-string: the right line with a wider caret, which is the same trade
	 the text path's map makes."
	aNode ___hasFragmentPositions___ ifTrue: [^ self].
	"WHERE THE STAMP GOES, which is not always where the node begins.
	 A compound node and its LEADING child begin at the same character --
	 ``_bad + _other'' and ``_bad'', ``f(x)'' and ``f'', ``a[i]'' and ``a'' --
	 so stamping both at that character makes their step points
	 indistinguishable, and the narrower child then wins every lookup.  The
	 text path never had this problem: a step point there lands on the
	 SELECTOR of the Smalltalk send, which for ``a ___binOpAdd___: b'' sits
	 between the operands.  So put the stamp in the same place -- just past the
	 leading child -- while the recorded RANGE stays the node's own.  The line
	 is unaffected, because the operator is on the leading child's last line."
	lead := aNode ___irStampChild___.
	stampAt := aNode beginPosition.
	(lead notNil
		and: [lead beginPosition = aNode beginPosition
		and: [lead endPosition notNil
		and: [aNode endPosition notNil
		and: [lead endPosition < aNode endPosition]]]])
			ifTrue: [stampAt := lead endPosition + 1].
	self at: stampAt.
	attachedSource isNil ifTrue: [^ self].
	start := ((aNode beginPosition - sourceBase + 1) max: 1).
	endPos := aNode endPosition
		ifNil: [aNode beginPosition]
		ifNotNil: [:e | e].
	endPos := ((endPos - sourceBase + 1) max: start) min: attachedSource size.
	"A node outside the attached slice describes nothing this method can be
	 executing, so it earns no entry."
	start > attachedSource size ifTrue: [^ self].
	"ARMED, not recorded: stamp: commits it if -- and only if -- a send follows.

	 GUARDED, because asking a node for its COLUMNS can raise.  ``column'' and
	 ``endColumn'' scan the module source backwards from the node's position
	 (AbstractLocationNode), and a node whose source or position is not what
	 that scan assumes fails there -- linecache's big module body and a nested
	 __init__ both did, and an IR compile that raises is a silent fallback to
	 the text path, so an unguarded read here costs COVERAGE rather than
	 precision.  Every other reader of these accessors guards them the same way
	 (AbstractNode>>___emitCurPosBefore:on:, BoolOpAst); a node that cannot say
	 where it is simply gets no entry, and the enclosing node's range still
	 covers the step point."
	pendingPos := [{ start. endPos. aNode beginLine. aNode column.
		aNode endLine. aNode endColumn }]
			on: Error do: [:ex |
				(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
				ex return: nil].
	^ self
%

category: 'private'
method: PyMethodIRBuilder
commitPendingPosition
	"Append the armed entry to the position map, once."

	| e |
	pendingPos isNil ifTrue: [^ self].
	e := pendingPos.
	pendingPos := nil.
	positionMap isNil ifTrue: [positionMap := OrderedCollection new].
	"One node commonly emits several sends and re-arms between them; every
	 repeat would write an identical entry, and dropping a repeat of the last
	 one removes them all, since they are adjacent by construction."
	(positionMap size >= 6
		and: [(positionMap at: positionMap size - 5) = (e at: 1)
		and: [(positionMap at: positionMap size - 4) = (e at: 2)]])
			ifTrue: [^ self].
	1 to: 6 do: [:i | positionMap add: (e at: i)].
	^ self
%

category: 'building'
method: PyMethodIRBuilder
positionMapComment
	"The position map as the trailing Smalltalk COMMENT that carries it into the
	compiled method -- BYTE FOR BYTE the form PrettyWriteStream>>mapCommentShiftedBy:
	writes for a text-compiled method, so one reader serves both paths.

	Answers '' when nothing was recorded.  Holds digits and spaces only, so
	nothing in it can close the comment early, and it is appended AFTER all
	source, so it shifts no offset it describes."

	| out |
	positionMap isNil ifTrue: [^ ''].
	positionMap isEmpty ifTrue: [^ ''].
	out := WriteStream on: String new.
	out nextPut: Character lf.
	out nextPutAll: '"___GRAILPOS___'.
	1 to: positionMap size by: 6 do: [:i |
		0 to: 5 do: [:k |
			out nextPut: $ .
			out nextPutAll: (positionMap at: i + k) printString]].
	out nextPutAll: ' "'.
	^ out contents
%

category: 'building'
method: PyMethodIRBuilder
attachPositionMap
	"Re-attach the source with the position map appended, just before generation.

	IT CANNOT BE ATTACHED EARLIER: the map is only complete once the whole body
	has been emitted, and the source has to be attached before that, because
	every node's offset is rebased against it.  Appending is safe precisely
	because it is an append -- it moves no offset the map describes -- and
	endSrcOffset has to cover the comment or ``sourceString'' would stop short
	of it and the reader would never see it."

	| mnClass full |
	(attachedSource isNil or: [positionMap isNil]) ifTrue: [^ self].
	full := attachedSource , self positionMapComment.
	mnClass := PyMethodIRBuilder node: #GsComMethNode.
	methNode fileName: methNode fileName source: full.
	methNode instVarAt: (mnClass allInstVarNames indexOf: #srcOffset) put: 1.
	methNode instVarAt: (mnClass allInstVarNames indexOf: #endSrcOffset)
		put: full size.
	^ self
%

category: 'private'
method: PyMethodIRBuilder
stamp: aNode
	"Record the current Python position on aNode when a source offset is set,
	and COMMIT the pending position-map entry when aNode is a send.

	WHY THE COMMIT LIVES HERE.  An entry earns its place in the map only if a
	step point can land inside it, which on this path means only if the node
	actually emitted a SEND -- the text path's rule (PrettyWriteStream>>
	sendFreeFrom:to:), reached structurally instead of by re-reading the
	generated text.  It matters more here than there, because the map resolves
	by SMALLEST containing range: an operand of ``1 / 0'' is a literal that
	emits no send, but its range (one character) is narrower than the
	division's, so recording it would win every lookup the division should win
	and every traceback would underline ``1'' instead of ``1 / 0''.  Measured
	exactly that way before the commit was made conditional.

	Every send is built through this method (send:to:with:env: and
	cascade:specs: both finish with ``self stamp:''), so the test is on the
	node's class rather than on the call site, and a send constructor added
	later is covered without knowing about this."

	curOffset ifNotNil: [aNode sourceOffset: curOffset].
	(aNode isKindOf: (PyMethodIRBuilder node: #GsComSendNode))
		ifTrue: [self commitPendingPosition].
	^ aNode
%

category: 'building'
method: PyMethodIRBuilder
argNamed: aSymbol
	^ self argNamed: aSymbol leafName: aSymbol
%

category: 'building'
method: PyMethodIRBuilder
argNamed: aSymbol leafName: aLeafSymbol
	"A method argument registered under the PYTHON name aSymbol (what leafFor:
	answers for a Name) but named aLeafSymbol in the compiled method -- the
	text's transport identifier for a parameter spelled like a Smalltalk
	pseudo-variable (``self'' -> ``_self'', cut 70)."

	| leaf |
	leaf := (PyMethodIRBuilder node: #GsComVarLeaf) new
		methodArg: aLeafSymbol
		argNumber: methNode arguments size + 1.
	methNode appendArg: leaf.
	locals at: aSymbol put: leaf.
	^ leaf
%

category: 'building'
method: PyMethodIRBuilder
tempNamed: aSymbol
	^ self tempNamed: aSymbol leafName: aSymbol
%

category: 'building'
method: PyMethodIRBuilder
tempNamed: aSymbol leafName: aLeafSymbol
	"A temp registered under the Python name aSymbol and named aLeafSymbol in
	the compiled method -- the text's transport identifier for a local spelled
	like a Smalltalk pseudo-variable (cut 70).

	A temp of the METHOD -- or, while a CLOSURE body is being emitted
	(nestedFunctionDo:, cut 64), a temp of the innermost closure block instead.
	The emitters allocate their helpers lazily and reuse them by name
	(``___iter0___'', ``___item0___'', ``___unpack___'', ``___fn___''), which
	is sound within ONE frame; a nested def's block runs in the MIDDLE of the
	enclosing frame's statements -- its ``for'' inside the enclosing ``for'' --
	so a helper shared with the enclosing method would be clobbered mid-loop
	(EventLoopTestCase: the iterator of the enclosing async for became the
	closure's range_iterator).  The text declares those helpers as block temps
	per use; a per-closure temp is the same isolation."

	| leaf |
	closureStack isEmpty
		ifTrue: [
			leaf := (PyMethodIRBuilder node: #GsComVarLeaf) new methodTemp: aLeafSymbol.
			methNode appendTemp: leaf]
		ifFalse: [
			| frame |
			frame := closureStack last.
			leaf := (PyMethodIRBuilder node: #GsComVarLeaf) new
				blockTemp: aLeafSymbol sourceLexLevel: (frame at: 2).
			(frame at: 1) appendTemp: leaf].
	locals at: aSymbol put: leaf.
	^ leaf
%

category: 'building'
method: PyMethodIRBuilder
instVarNamed: aSymbol
	"The VarLeaf for a NAMED INSTANCE VARIABLE of the target class -- a
	Python ``__slots__'' entry, which ClassDefAst declares as the mangled
	instVar ``___slot_x___'' (cut 51).  Resolved by offset against the class
	the method is being built ON (targetClass allInstVarNames), which is why
	the slot classes had to wait for the deferred build: the class exists by
	then.  One leaf per name, cached with the locals (a mangled slot name can
	collide with no Python local)."

	| leaf idx |
	(locals at: aSymbol otherwise: nil) ifNotNil: [:l | ^ l].
	idx := targetClass allInstVarNames indexOf: aSymbol.
	idx = 0 ifTrue: [
		Error signal: 'PyMethodIRBuilder: ' , targetClass name asString
			, ' has no instVar named ' , aSymbol printString].
	leaf := (PyMethodIRBuilder node: #GsComVarLeaf) new
		instanceVariable: aSymbol ivOffset: idx.
	locals at: aSymbol put: leaf.
	^ leaf
%

category: 'building'
method: PyMethodIRBuilder
guardLocals: aCollectionOfSymbols
	"The locals whose READS must carry the text's unbound guard ``(x ifNil:
	[UnboundLocalError ___signalUnbound___: #x])'' (cut 72): set by the def
	build when the flow analysis could not prove every body-local bound before
	every read.  Empty (the default) means bare reads."

	guardedLocals := aCollectionOfSymbols asIdentitySet
%

category: 'building'
method: PyMethodIRBuilder
guardsLocal: aSymbol
	^ guardedLocals notNil and: [guardedLocals includes: aSymbol]
%

category: 'building'
method: PyMethodIRBuilder
leafFor: aSymbol
	"The VarLeaf for a registered parameter or local, or nil."

	^ locals at: aSymbol otherwise: nil
%

category: 'nodes'
method: PyMethodIRBuilder
localVar: aSymbol
	"A variable node reading a registered parameter/local by Python name."

	| leaf |
	leaf := self leafFor: aSymbol.
	leaf isNil ifTrue: [
		Error signal: 'PyMethodIRBuilder: no local named ' , aSymbol printString].
	^ self var: leaf
%

category: 'building'
method: PyMethodIRBuilder
add: aNode
	"Append aNode as a statement in the current (innermost) block/method context."

	self stamp: aNode.
	blockStack last appendStatement: aNode.
	^ aNode
%

category: 'nodes'
method: PyMethodIRBuilder
obj: anObject
	"A literal reference to any Smalltalk object (Integer, Float, String,
	ByteArray, ...)."

	^ self stamp: ((PyMethodIRBuilder node: #GsComLiteralNode) newObject: anObject)
%

category: 'nodes'
method: PyMethodIRBuilder
trueLit
	^ self stamp: (PyMethodIRBuilder node: #GsComLiteralNode) newTrue
%

category: 'nodes'
method: PyMethodIRBuilder
falseLit
	^ self stamp: (PyMethodIRBuilder node: #GsComLiteralNode) newFalse
%

category: 'nodes'
method: PyMethodIRBuilder
var: aVarLeaf
	^ self stamp: ((PyMethodIRBuilder node: #GsComVariableNode) new leaf: aVarLeaf)
%

category: 'nodes'
method: PyMethodIRBuilder
globalNamed: aSymbol
	"Reference a Python-dictionary global (e.g. #None, #Ellipsis) via its
	association on the Grail compile symbol list."

	| assoc |
	assoc := importlib ___grailCompileSymbolList___ resolveSymbol: aSymbol.
	assoc isNil ifTrue: [
		Error signal: 'PyMethodIRBuilder: unknown global ' , aSymbol printString].
	^ self stamp: ((PyMethodIRBuilder node: #GsComVariableNode) new
		leaf: ((PyMethodIRBuilder node: #GsComVarLeaf) new literalVariable: assoc))
%

category: 'nodes'
method: PyMethodIRBuilder
send: aSelector to: rcvrNode with: argNodes
	"A non-optimized send in ENV 1 (where Grail's Python protocol methods live)."

	^ self send: aSelector to: rcvrNode with: argNodes env: 1
%

category: 'nodes'
method: PyMethodIRBuilder
send: aSelector to: rcvrNode with: argNodes env: anEnvId
	"A non-optimized send dispatched in anEnvId.  selLeaf is a bare Symbol (the
	builder's stSelector: is bit-rotted -- see experiments/ir/README).  envFlags
	holds the send's environment id directly (comparse.ht: envId() == envFlags),
	so a Python-protocol send is env 1 and a ``@env0:'' Smalltalk send is env 0.

	EXCEPTION: the #value: / #value:value: selectors get a REAL selector leaf
	carrying specialOpcode 109 / specialSendClass ExecBlock -- exactly what
	source compilation attaches even under @env1:.  The opcode makes a RAW
	ExecBlock receiver (a class-body lambda read off its class, the legacy
	block-calling protocol) invoke the block directly; every other receiver
	falls through to the normal envFlags dispatch (BoundMethod, classes,
	object's not-callable TypeError).  A bare-Symbol leaf skips the opcode, so
	a raw block landed on object>>value:value: and raised ``'ExecBlock' object
	is not callable'' where text invoked it.  (GsComSelectorLeaf class>>
	newSelector:env: cannot build this leaf per-user -- its lazy table is
	SystemUser-only -- so the leaf is assembled directly.)"

	| s sClass |
	sClass := PyMethodIRBuilder node: #GsComSendNode.
	s := sClass new.
	s rcvr: rcvrNode.
	s instVarAt: (sClass allInstVarNames indexOf: #selLeaf)
		put: ((#(#'value:' #'value:value:') includes: aSelector)
			ifTrue: [self execBlockLeafFor: aSelector]
			ifFalse: [aSelector]).
	s instVarAt: (sClass allInstVarNames indexOf: #envFlags) put: anEnvId.
	argNodes do: [:a | s appendArgument: a].
	^ self stamp: s
%

category: 'private'
method: PyMethodIRBuilder
execBlockLeafFor: aSelector
	"A GsComSelectorLeaf with the ExecBlock-invoke special opcode (109), as
	source compilation attaches to every value: / value:value: send."

	| slCls ivars leaf |
	slCls := PyMethodIRBuilder node: #GsComSelectorLeaf.
	ivars := slCls allInstVarNames.
	leaf := slCls new.
	leaf setIRnodeKind.
	leaf instVarAt: (ivars indexOf: #selector) put: aSelector.
	leaf instVarAt: (ivars indexOf: #specialOpcode) put: 109.
	leaf instVarAt: (ivars indexOf: #specialSendClass) put: ExecBlock.
	^ leaf
%

category: 'nodes'
method: PyMethodIRBuilder
selfNode
	"A read of ``self'' (varKind SELF, lexLevel 0)."

	| leaf |
	leaf := (PyMethodIRBuilder node: #GsComVarLeaf) new.
	leaf initializeSelf.
	^ self var: leaf
%

category: 'control'
method: PyMethodIRBuilder
blockWithArg: argSymbol do: aOneArgBlock
	"Open a GsComBlockNode with ONE block argument, run aOneArgBlock passing
	the argument's GsComVarLeaf (reads via var:), close it; answer the block
	node.  Statements are appended via add:, as in inBlockDo:.  The arg is a
	block arg only -- never registered as a method local."

	| blk leaf |
	lexLevel := lexLevel + 1.
	blk := (PyMethodIRBuilder node: #GsComBlockNode) new lexLevel: lexLevel.
	self stamp: blk.
	leaf := (PyMethodIRBuilder node: #GsComVarLeaf) new
		blockArg: argSymbol argNumber: 1 forBlock: blk.
	blk appendArg: leaf.
	blockStack addLast: blk.
	aOneArgBlock value: leaf.
	blockStack removeLast.
	lexLevel := lexLevel - 1.
	^ blk
%

category: 'control'
method: PyMethodIRBuilder
blockWithArg: argSymbol temp: tempSymbol do: aTwoArgBlock
	"A block with one argument AND one block temp -- ``[:arg | | temp | ...]''.
	aTwoArgBlock receives both leaves; statements via add:.  Neither name is
	registered as a method local."

	| blk argLeaf tempLeaf |
	lexLevel := lexLevel + 1.
	blk := (PyMethodIRBuilder node: #GsComBlockNode) new lexLevel: lexLevel.
	self stamp: blk.
	argLeaf := (PyMethodIRBuilder node: #GsComVarLeaf) new
		blockArg: argSymbol argNumber: 1 forBlock: blk.
	blk appendArg: argLeaf.
	tempLeaf := (PyMethodIRBuilder node: #GsComVarLeaf) new
		blockTemp: tempSymbol sourceLexLevel: lexLevel.
	blk appendTemp: tempLeaf.
	blockStack addLast: blk.
	aTwoArgBlock value: argLeaf value: tempLeaf.
	blockStack removeLast.
	lexLevel := lexLevel - 1.
	^ blk
%

category: 'nodes'
method: PyMethodIRBuilder
arrayOf: nodeCollection
	"A ``{ e1 . e2 . ... }'' array-builder expression (GsComArrayBuilderNode):
	evaluates the element nodes in order and answers a new Array.  What Python
	tuple/list literals lower through."

	| arr |
	arr := (PyMethodIRBuilder node: #GsComArrayBuilderNode) new.
	nodeCollection do: [:n | arr appendElement: n].
	^ self stamp: arr
%

category: 'nodes'
method: PyMethodIRBuilder
cascade: rcvrNode sends: sendSpecs env: anEnvId
	"A cascade ``rcvr sel1: a; sel2: b; yourself'' -- GsComCascadeNode over
	sends whose rcvr is nil.  sendSpecs is a collection of (selector -> args
	Array) associations, in order.  What a keyword-argument dict literal lowers
	through: (PyDict new) at: 'k' put: v; ...; yourself."

	^ self cascade: rcvrNode specs: (sendSpecs collect: [:spec | { spec key. spec value. anEnvId }])
%

category: 'nodes'
method: PyMethodIRBuilder
cascade: rcvrNode specs: sendSpecs
	"cascade:sends:env: with a per-send environment: each spec is
	{ selector. args Array. envId }.  A keyword dict with a ``**splat'' mixes
	env-0 ``at:put:'' with the env-1 ``update:'' the text emits for the splat
	(cut 56)."

	| casc cClass sClass |
	cClass := PyMethodIRBuilder node: #GsComCascadeNode.
	sClass := PyMethodIRBuilder node: #GsComSendNode.
	casc := cClass new.
	casc rcvr: rcvrNode.
	sendSpecs do: [:spec | | snd |
		snd := sClass new.
		snd rcvr: nil.
		snd instVarAt: (sClass allInstVarNames indexOf: #selLeaf) put: (spec at: 1).
		snd instVarAt: (sClass allInstVarNames indexOf: #envFlags) put: (spec at: 3).
		(spec at: 2) do: [:a | snd appendArgument: a].
		self stamp: snd.
		casc appendSend: snd].
	^ self stamp: casc
%

category: 'nodes'
method: PyMethodIRBuilder
assign: aVarLeaf from: aNode
	"aVarLeaf := aNode.  aVarLeaf is a registered local/temp leaf (leafFor:)."

	^ self stamp: ((PyMethodIRBuilder node: #GsComAssignmentNode) new
		dest: aVarLeaf source: aNode)
%

category: 'nodes'
method: PyMethodIRBuilder
return: aNode
	"A Python ``return'' -- ALWAYS a home (method) return, exactly what source
	compilation emits for ``^'' anywhere (oracle: returnKind 1 both at method
	top level and inside blocks).  ``new return:'' (returnKind 0) is a
	block-LOCAL return: indistinguishable at method level and in INLINED blocks
	(cuts 1-13 never noticed), but inside a REAL block -- a while body under its
	on: PythonContinue do: handler -- it ends only the block, so ``return''
	inside a loop re-entered the loop forever."

	^ self stamp:
		((PyMethodIRBuilder node: #GsComReturnNode) new returnFromHome: aNode)
%

category: 'nodes'
method: PyMethodIRBuilder
returnNone
	"Python ``return'' with no value / a fall-off-the-end return: ^ None."

	^ self return: (self globalNamed: #None)
%

category: 'nodes'
method: PyMethodIRBuilder
nilLit
	^ self stamp: (PyMethodIRBuilder node: #GsComLiteralNode) newNil
%

category: 'private'
method: PyMethodIRBuilder
controlOp: aSend put: aCode
	"Set an optimized-send control op (COMPAR_* value) so the VM inlines it."

	aSend
		instVarAt: ((PyMethodIRBuilder node: #GsComSendNode) allInstVarNames
			indexOf: #controlOp)
		put: aCode.
	^ aSend
%

category: 'private'
method: PyMethodIRBuilder
comparAt: aSymbol
	^ (PyMethodIRBuilder node: #GsCompilerIRNode) _classVars at: aSymbol
%

category: 'control'
method: PyMethodIRBuilder
inBlockDo: aZeroArgBlock
	"Open a GsComBlockNode context, run aZeroArgBlock (which appends statements
	via add:), close it; answer the block node."

	| blk |
	lexLevel := lexLevel + 1.
	blk := (PyMethodIRBuilder node: #GsComBlockNode) new lexLevel: lexLevel.
	self stamp: blk.
	blockStack addLast: blk.
	aZeroArgBlock value.
	blockStack removeLast.
	lexLevel := lexLevel - 1.
	^ blk
%

category: 'control'
method: PyMethodIRBuilder
if: condNode then: aThenBlock
	"add:  (cond) ifTrue: [ ...aThenBlock... ]"

	| ifSend |
	ifSend := self send: #ifTrue: to: condNode with: { self inBlockDo: aThenBlock }.
	self controlOp: ifSend put: (self comparAt: #COMPAR__IF_TRUE).
	^ self add: ifSend
%

category: 'control'
method: PyMethodIRBuilder
unless: condNode then: aThenBlock
	"``cond ifFalse: [ ... ]'' as an inlined statement (controlOp
	COMPAR__IF_FALSE) -- what ``assert'' lowers through."

	| ifSend |
	ifSend := self send: #ifFalse: to: condNode with: { self inBlockDo: aThenBlock }.
	self controlOp: ifSend put: (self comparAt: #COMPAR__IF_FALSE).
	^ self add: ifSend
%

category: 'control'
method: PyMethodIRBuilder
ifValue: condNode then: aThenBlock else: anElseBlock
	"(cond) ifTrue: [ ... ] ifFalse: [ ... ] as an un-added VALUE node (inlined,
	COMPAR_IF_TRUE_IF_FALSE) -- for expression positions (Python's ternary).
	if:then:else: below is the statement form."

	| thenBlk elseBlk ifSend |
	thenBlk := self inBlockDo: aThenBlock.
	elseBlk := self inBlockDo: anElseBlock.
	ifSend := self send: #ifTrue:ifFalse: to: condNode with: { thenBlk. elseBlk }.
	self controlOp: ifSend put: (self comparAt: #COMPAR_IF_TRUE_IF_FALSE).
	^ ifSend
%

category: 'control'
method: PyMethodIRBuilder
if: condNode then: aThenBlock else: anElseBlock
	"add:  (cond) ifTrue: [ ...aThenBlock... ] ifFalse: [ ...anElseBlock... ]"

	^ self add: (self ifValue: condNode then: aThenBlock else: anElseBlock)
%

category: 'control'
method: PyMethodIRBuilder
andValue: condNode then: aThenBlock
	"``(cond) and: [ ... ]'' as an un-added VALUE node, inlined (controlOp
	COMPAR_AND_SELECTOR) exactly as source compilation inlines ``and:'' with a
	literal block argument (oracle: the compiled IR of ``a isNil not and: [b
	includesKey: 1]'' is an ``and:'' send with controlOp 8 over a block).  What
	the argument-binding prologue's ``(kwargs isNil not and: [kwargs
	includesKey: 'p'])'' gate lowers through."

	| s |
	s := self send: #and: to: condNode with: { self inBlockDo: aThenBlock }.
	self controlOp: s put: (self comparAt: #COMPAR_AND_SELECTOR).
	^ s
%

category: 'control'
method: PyMethodIRBuilder
orValue: condNode then: aThenBlock
	"``(cond) or: [ ... ]'' as an un-added VALUE node, inlined (controlOp
	COMPAR_OR_SELECTOR) as source compilation inlines ``or:'' with a literal
	block -- andValue:then:'s twin."

	| s |
	s := self send: #or: to: condNode with: { self inBlockDo: aThenBlock }.
	self controlOp: s put: (self comparAt: #COMPAR_OR_SELECTOR).
	^ s
%

category: 'control'
method: PyMethodIRBuilder
blockWithArgs: argSymbols do: aBlock
	"A GsComBlockNode with SEVERAL block arguments -- ``[:a :b | ...]'' -- the
	shape an inject:into: takes.  aBlock receives the argument leaves as an
	Array (reads via var:); statements via add:.  None is registered as a
	method local.  blockWithArg:do: is the one-argument case."

	| blk leaves |
	lexLevel := lexLevel + 1.
	blk := (PyMethodIRBuilder node: #GsComBlockNode) new lexLevel: lexLevel.
	self stamp: blk.
	leaves := argSymbols collect: [:sym |
		| leaf |
		leaf := (PyMethodIRBuilder node: #GsComVarLeaf) new
			blockArg: sym argNumber: (argSymbols indexOf: sym) forBlock: blk.
		blk appendArg: leaf.
		leaf].
	blockStack addLast: blk.
	aBlock value: leaves.
	blockStack removeLast.
	lexLevel := lexLevel - 1.
	^ blk
%

category: 'control'
method: PyMethodIRBuilder
ifNilValue: aNode then: aNilBlock else: aNotNilBlock
	"``(x) ifNil: [ ... ] ifNotNil: [ ... ]'' as an un-added VALUE node, inlined
	(controlOp COMPAR_IF_NIL_IF_NOTNIL, the zero-argument ifNotNil: form) as
	source compilation inlines it.  The keyword-only binding's ``kwargs ifNil:
	[default] ifNotNil: [kwargs at: 'k' ifAbsent: [default]]'' shape."

	| nilBlk notNilBlk s |
	nilBlk := self inBlockDo: aNilBlock.
	notNilBlk := self inBlockDo: aNotNilBlock.
	s := self send: #ifNil:ifNotNil: to: aNode with: { nilBlk. notNilBlk }.
	self controlOp: s put: (self comparAt: #COMPAR_IF_NIL_IF_NOTNIL).
	^ s
%

category: 'control'
method: PyMethodIRBuilder
ifNilValue: aNode then: aNilBlock
	"``(x) ifNil: [ ... ]'' as an un-added VALUE node, inlined (controlOp
	COMPAR_IF_NIL): x when non-nil, else the block's value.  The **kwargs
	binding's ``(kwargs ifNil: [PyDict new]) copy'' shape."

	| s |
	s := self send: #ifNil: to: aNode with: { self inBlockDo: aNilBlock }.
	self controlOp: s put: (self comparAt: #COMPAR_IF_NIL).
	^ s
%

category: 'control'
method: PyMethodIRBuilder
handlerBlockNamed: aSymbol
	"``[:aSymbol | nil]'' -- a one-argument handler block answering nil, the
	shape the text path emits for its PythonBreak / PythonContinue handlers.
	The arg is declared on the block only (never registered as a method local)."

	| blk leaf |
	lexLevel := lexLevel + 1.
	blk := (PyMethodIRBuilder node: #GsComBlockNode) new lexLevel: lexLevel.
	self stamp: blk.
	leaf := (PyMethodIRBuilder node: #GsComVarLeaf) new
		blockArg: aSymbol argNumber: 1 forBlock: blk.
	blk appendArg: leaf.
	blk appendStatement: self nilLit.
	lexLevel := lexLevel - 1.
	^ blk
%

category: 'control'
method: PyMethodIRBuilder
pushHandlerEx: anExLeaf
	"Enter an except handler whose block arg is anExLeaf: a bare ``raise''
	emitted inside the handler body names it (``___reRaise___: ___ex''), the
	way the text path names the textually enclosing handler's ___ex.  Paired
	with popHandlerEx; TryAst brackets the handler-body emit with the two."

	handlerExStack addLast: anExLeaf.
	^ anExLeaf
%

category: 'control'
method: PyMethodIRBuilder
popHandlerEx

	^ handlerExStack removeLast
%

category: 'control'
method: PyMethodIRBuilder
genLeaf
	"The ``___gen___'' block-argument leaf of the generator / coroutine wrapper
	block whose body is being emitted -- the PythonGenerator (PythonCoroutine,
	PythonAsyncGenerator) the runtime hands the body -- or nil outside a
	wrapped body.  A ``yield'' / ``yield from'' / ``await'' sends to it; a
	``return'' inside one signals PythonReturn instead of returning from home,
	because the home method has already answered the wrapper by the time the
	body runs (cut 53; FunctionDefAst>>___emitIRWrappedBodyOn___:)."

	^ genLeaf
%

category: 'control'
method: PyMethodIRBuilder
genLeaf: aLeafOrNil
	genLeaf := aLeafOrNil.
	^ self
%

category: 'control'
method: PyMethodIRBuilder
currentHandlerEx
	"The innermost open except handler's ___ex leaf, or nil outside any."

	^ handlerExStack isEmpty ifTrue: [nil] ifFalse: [handlerExStack last]
%

category: 'control'
method: PyMethodIRBuilder
whileTrue: condBlockNode do: bodyBlockNode
	"An INLINED ``[cond] whileTrue: [body]'' send (COMPAR_WHILE_TRUE), answered
	un-added so the caller can place it.  This is the TEXT-SHAPED loop (the
	caller wraps body/loop in PythonContinue / PythonBreak on:do: handlers);
	while:do: below is the goto-based alternative kept for later optimization."

	| w |
	w := self send: #whileTrue: to: condBlockNode with: { bodyBlockNode }.
	self controlOp: w put: (self comparAt: #COMPAR_WHILE_TRUE).
	^ w
%

category: 'control'
method: PyMethodIRBuilder
while: aCondNodeBlock do: aBodyBlock
	"add a Python-shaped while loop.  aCondNodeBlock answers the condition node;
	aBodyBlock appends the body statements.  break / continue inside aBodyBlock
	target THIS loop (see break / continue)."

	| breakLab contLab condBlk bodyBlk whileSend loop |
	breakLab := (PyMethodIRBuilder node: #GsComLabelNode) new
		lexLevel: lexLevel argForValue: true.
	contLab := (PyMethodIRBuilder node: #GsComLabelNode) new
		lexLevel: lexLevel + 1 argForValue: false.
	loopStack addLast: breakLab -> contLab.
	condBlk := self inBlockDo: [ self add: aCondNodeBlock value ].
	bodyBlk := self inBlockDo: [ aBodyBlock value. self add: contLab ].
	loopStack removeLast.
	whileSend := self send: #whileTrue: to: condBlk with: { bodyBlk }.
	self controlOp: whileSend put: (self comparAt: #COMPAR_WHILE_TRUE).
	loop := (PyMethodIRBuilder node: #GsComLoopNode) new.
	loop send: whileSend; breakLabel: breakLab.
	^ self add: loop
%

category: 'control'
method: PyMethodIRBuilder
break
	| brk |
	loopStack isEmpty ifTrue: [Error signal: 'break outside a loop'].
	brk := (PyMethodIRBuilder node: #GsComGotoNode) new.
	brk localRubyBreak: loopStack last key.
	brk argNode: self nilLit.
	^ self add: brk
%

category: 'control'
method: PyMethodIRBuilder
continue
	| cont |
	loopStack isEmpty ifTrue: [Error signal: 'continue outside a loop'].
	cont := (PyMethodIRBuilder node: #GsComGotoNode) new.
	cont localRubyNext: loopStack last value argForValue: false.
	^ self add: cont
%

category: 'generation'
method: PyMethodIRBuilder
ensureEnvDict
	"The persistent method dict for `env` must exist before at:put:.
	persistentMethodDictForEnv:put: is a protected primitive; the pre-pass in
	___buildModuleClassBody:name: has already compiled an arity stub into env 1,
	so the dict exists.  Guard anyway for standalone callers."

	(targetClass persistentMethodDictForEnv: env) ifNil: [
		"Create the dict the way Behavior>>___compileMethod:category: does -- the
		plain compileMethod:dictionaries:category:environmentId: form.  The
		intoMethodDict: nil / intoCategories: nil variant used here before made
		a dict a LATER ordinary compile on the same class replaced wholesale: a
		class-body method installed first through IR (Counter.__init__, the
		first method of a class the class-method seam ever built) vanished
		when the text-compiled forwarder that followed it created the real
		dict.  The stub is removed again; it exists only to create the dict."
		[targetClass
			compileMethod: '___irStub___ ^ nil'
			dictionaries: importlib ___grailCompileSymbolList___
			category: 'Grail-IR Stub'
			environmentId: env] on: CompileWarning do: [:w | w resume].
		[targetClass removeSelector: #'___irStub___' environmentId: env]
			on: Error do: [:e | e return: nil]].
	^ targetClass persistentMethodDictForEnv: env
%

category: 'generation'
method: PyMethodIRBuilder
generatedMethod
	"Generate the method from the built IR (primitive 679) and answer it WITHOUT
	installing it anywhere -- used by the capability probe, which must have no side
	effect on any method dictionary.  With WARNINGS (e.g. ``statement with no
	effect'' from a docstring expression statement) generateFromIR: answers an
	Array whose first element is the method -- warnings are non-fatal, exactly
	as they are for a source compile."

	| result |
	self attachPositionMap.
	result := GsNMethod generateFromIR: methNode.
	(result isKindOf: GsNMethod) ifTrue: [^ result].
	((result isKindOf: Array)
		and: [result size >= 1
		and: [(result at: 1) isKindOf: GsNMethod]])
			ifTrue: [^ result at: 1].
	^ Error signal: 'PyMethodIRBuilder generateFromIR failed: ' , result printString
%

category: 'generation'
method: PyMethodIRBuilder
install
	"Generate the method (primitive 679, warnings tolerated -- see
	generatedMethod) and install it in the target class's env-`env` method
	dictionary, replacing the arity stub.  Answer the GsNMethod."

	| meth |
	meth := self generatedMethod.
	self ensureEnvDict at: methNode selector put: meth.
	Behavior _clearLookupCaches: env.
	env = 0 ifFalse: [Behavior _clearLookupCaches: 0].
	^ meth
%

category: 'generation'
method: PyMethodIRBuilder
___irRegenerateOn___: aClass
	"Generate the ALREADY-BUILT IR again, for a DIFFERENT class, and install the
	result in that class's env-`env` dictionary; answer the GsNMethod.

	This is what makes a method-local class's method reusable (cut 79).  Such a
	class is built afresh on every call of its enclosing def, so a method cannot
	simply be built once and shared: a GsNMethod carries an `inClass`, and
	`whichClassIncludesSelector:environmentId:` -- which is a CACHING PRIMITIVE,
	not a dictionary walk -- answers that class rather than the one whose
	dictionary holds the entry.  Sharing therefore made the class-body
	@property's getter/setter pair look like it came from two different classes
	and `___grailPyDefinedAccessorPair___:setter:` declined it, so `T().p`
	answered the BoundMethod (measured, and the reason this method exists).

	Regenerating is sound because the IR node tree is COMPLETE and
	self-contained: `class:` is the only thing in it that names the target, the
	position map holds SmallIntegers, and `attachPositionMap` recomputes the
	attached source from `attachedSource` each time, so it is idempotent.
	Measured: two generations of one methNode for two classes answer two
	GsNMethods, each with its own correct `inClass`, both running and both
	carrying the same Python source.

	It is also CHEAPER than what it replaces -- primitive 679 over a finished
	node tree, against the source compile of the whole method text that the
	flag-off path does on every one of those calls."

	targetClass := aClass.
	methNode class: aClass.
	^ self install
%

category: 'control'
method: PyMethodIRBuilder
blockWithTemps: tempSymbols do: aBlock
	"A zero-argument GsComBlockNode declaring block TEMPS -- ``[| t1 t2 | ...]''
	-- the shape a comprehension's accumulator, source, iterator and target
	temps take in the text (cut 57).  aBlock receives the temp leaves as an
	Array, in order; statements via add:.  None is registered as a method
	local: a Python-named target is bound into the local table for the body's
	duration by withLocals:do:, so a read resolves to the block temp and an
	enclosing method temp of the same name is shadowed, not overwritten."

	| blk leaves |
	lexLevel := lexLevel + 1.
	blk := (PyMethodIRBuilder node: #GsComBlockNode) new lexLevel: lexLevel.
	self stamp: blk.
	leaves := tempSymbols collect: [:sym |
		| leaf |
		leaf := (PyMethodIRBuilder node: #GsComVarLeaf) new
			blockTemp: sym sourceLexLevel: lexLevel.
		blk appendTemp: leaf.
		leaf].
	blockStack addLast: blk.
	aBlock value: leaves.
	blockStack removeLast.
	lexLevel := lexLevel - 1.
	^ blk
%

category: 'control'
method: PyMethodIRBuilder
blockWithArgs: argSymbols temps: tempSymbols do: aTwoArgBlock
	"A GsComBlockNode with SEVERAL block arguments AND block temps --
	``[:a :b | | t1 t2 | ...]'' -- the shape of a nested def's closure block
	(cut 64: ``[:___positional___ :___kwargs___ | | a b ... | ...]'').
	aTwoArgBlock receives the argument leaves and the temp leaves, each as an
	Array in order; statements via add:.  None is registered as a method local:
	the nested def's Python-named parameters and locals are bound into the
	local table for the body's duration by withLocals:do:, so a read inside
	the block resolves to its temp and an enclosing local of the same name is
	shadowed, not overwritten -- blockWithTemps:do:'s rule."

	| blk argLeaves tempLeaves |
	lexLevel := lexLevel + 1.
	blk := (PyMethodIRBuilder node: #GsComBlockNode) new lexLevel: lexLevel.
	self stamp: blk.
	argLeaves := argSymbols collect: [:sym |
		| leaf |
		leaf := (PyMethodIRBuilder node: #GsComVarLeaf) new
			blockArg: sym argNumber: (argSymbols indexOf: sym) forBlock: blk.
		blk appendArg: leaf.
		leaf].
	tempLeaves := tempSymbols collect: [:sym |
		| leaf |
		leaf := (PyMethodIRBuilder node: #GsComVarLeaf) new
			blockTemp: sym sourceLexLevel: lexLevel.
		blk appendTemp: leaf.
		leaf].
	blockStack addLast: blk.
	aTwoArgBlock value: argLeaves value: tempLeaves.
	blockStack removeLast.
	lexLevel := lexLevel - 1.
	^ blk
%

category: 'control'
method: PyMethodIRBuilder
inNestedFunction
	"True while the body of a NESTED def or lambda -- a closure block inside
	the method, not the method's own body -- is being emitted (cut 64).  A
	``return'' there cannot be a home return: the block is the Python
	function, and ``^'' would leave the ENCLOSING method (the text's reason for
	its #exception return mode), so ReturnAst signals PythonReturn for the
	block's own ``on: PythonReturn do:'' handler instead, as it does inside a
	generator's wrapper block (genLeaf)."

	^ nestedFnDepth > 0
%

category: 'control'
method: PyMethodIRBuilder
nestedFunctionDo: aBlock
	"Run aBlock -- which emits a nested function's BODY, and must be called
	from inside that function's closure block (blockStack last) -- with
	inNestedFunction true and the closure open for helper temps: tempNamed:
	allocates on the closure block for the duration, and every inherited
	helper binding (a ``___''-prefixed name that is not one of the def-time
	default temps ``___default_...'' / ``___lamdef_...'' the wrapper bound
	just outside) is hidden so the emitters make their own -- see
	tempNamed:.  The local table is restored whole afterwards, so nothing
	registered inside leaks out to the enclosing frame."

	| saved |
	saved := locals copy.
	closureStack addLast: { blockStack last. lexLevel. saved }.
	nestedFnDepth := nestedFnDepth + 1.
	(locals keys select: [:k |
		| name |
		name := k asString.
		(name size > 3 and: [(name copyFrom: 1 to: 3) = '___'])
			and: [((name size >= 11 and: [(name copyFrom: 1 to: 11) = '___default_'])
				or: [name size >= 10 and: [(name copyFrom: 1 to: 10) = '___lamdef_']]) not]])
		do: [:k | locals removeKey: k ifAbsent: []].
	^ aBlock ensure: [
		nestedFnDepth := nestedFnDepth - 1.
		closureStack removeLast.
		locals := saved]
%

category: 'building'
method: PyMethodIRBuilder
withLocals: bindings do: aBlock
	"Run aBlock with each binding (a Python-name Symbol -> VarLeaf association)
	in force in the local table, then restore what each name resolved to
	before -- a SCOPED shadow, for a comprehension's target temps (cut 57):
	inside the comprehension a bare read or store of the name is the block
	temp, after it the enclosing method temp (or parameter) again, exactly the
	text's block-temp scoping.  Restored under ensure: so a failed emit leaves
	the table as it found it."

	| saved |
	saved := bindings collect: [:assoc |
		assoc key -> (locals at: assoc key otherwise: nil)].
	bindings do: [:assoc | locals at: assoc key put: assoc value].
	^ aBlock ensure: [
		saved do: [:assoc |
			assoc value isNil
				ifTrue: [locals removeKey: assoc key ifAbsent: []]
				ifFalse: [locals at: assoc key put: assoc value]]]
%

category: 'accessing'
method: PyMethodIRBuilder
localNameSet
	"The Python names currently registered as parameters / locals -- the set an
	emitter must judge a free variable against, and the one that is live at
	THIS point of the walk (withLocals:do: adds and removes a nested scope's
	names around its body).  A method-local class statement (cut 77) needs it
	to decide which of its captures name an enclosing local."

	| names |
	names := Set new.
	locals keysDo: [:k | names add: k asString].
	^ names
%

category: 'accessing'
method: PyMethodIRBuilder
targetClass
	"The class this method is being built onto.  A method-local class statement
	(cut 76) compiles its text helper onto the SAME class, so that Smalltalk
	``self'' means inside the helper what it means in this method."

	^ targetClass
%
