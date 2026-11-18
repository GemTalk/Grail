"The IR backend of ClassBuildEmitter (P3.2): builds a class statement's BUILD
as GsCompilerIRNode trees through a PyMethodIRBuilder, from the same walk of
ClassDefAst >> printSmalltalkRuntimeWith: that ClassBuildTextEmitter turns
into text.  There is no second copy of the class emitter: every decision is
made once, in ClassDefAst, and this class only answers HOW each construct is
built.

A VALUE STACK, NOT BLOCK RESULTS.  The text backend streams, so it never
needs what a sub-expression block answers -- and the emitter's helpers do not
answer it reliably (``[self ___emitImportlibOn___: e]'' answers the
ClassDefAst).  So each EXPRESSION operation pushes exactly one node here, and
each operation that takes sub-expression blocks evaluates them in source order
and pops exactly one node per block (___eval:), refusing a block that left
any other count.  A STATEMENT operation pops its expression and adds it to the
builder's innermost block.  A BODY block -- a block literal's, a conditional
branch's -- is evaluated inside its own builder block; what it leaves on the
stack (at most one node, the body's unterminated last expression) becomes the
block's last statement, which is its value.

NAMES.  ``var:'' and ``assign:from:'' resolve a name the way the Smalltalk
compiler resolves it in the text helper: the innermost block's args and temps
first (the scopes this backend opens), then the helper method's own args and
temps (registered on the builder, leafFor:), then the pseudo-variables, then
the compile symbol list (PyMethodIRBuilder >> globalNamed:, the list the text
helper is compiled against).  An unknown name raises, as an undeclared
identifier fails the text compile.

CHILD NODES.  ``expressionNode:'' and ``parenthesizedNode:'' answer, in order:

  * a node the helper's CALLER evaluated in the enclosing frame -- a base, a
    keyword value, a class decorator (``at:put:pre:'' maps the AST node to the
    helper temp that holds its value) -- which is CPython's
    __build_class__ order;
  * a ConstantAst, whose IR emit reads no scope;
  * any other class-body VALUE expression (plan P3.3): the node's own IR
    emitter, run on the helper's builder, as a def's body is built.  Its
    names are read through the class-body read the text writes too (NameAst
    >> ___emitClassBodyValueWith___:), which reaches this emitter through
    the builder (PyMethodIRBuilder >> classBuildEmitter) and resolves the
    class under construction and every other name exactly as the text
    helper's compile does (var:).  ClassDefAst >> ___irClassHelperTextReason___:
    admits only the shapes that holds for, so an expression the def
    predicates do not find IR-eligible HERE, in the class-body context, is an
    invariant failure: it raises, and the enclosing method falls back to text
    as any IR emit error does.

``statementNode:'' always refuses: a class-body STATEMENT emitted through its
own emitter (control flow, a runtime statement) is a later P3 step, and
___irClassHelperTextReason___: keeps every class that has one on text.

LAYOUT is a no-op: ``newline'', ``space'', and the spellings that exist only
for the text (``openValueBlockLine:'', ``compactBraceArray:'',
``sendOnNextLine:...'', ``stringIndentedByStream:'') are built as their plain
forms.  ``stringIndentedByStream:'' is therefore the plain literal here, which
is the value the text arm's spelling was meant to have.

POSITIONS.  The class-build machinery is stamped at a position that
resolves to NO Python line (restAt:), so while the machinery runs -- the
subclass mint, __prepare__, the metaclass call, __init_subclass__ -- the
helper is not a Python frame, and an error there is reported against the
enclosing frame's ``class'' line, as CPython reports what __build_class__
raises.  ``mapDecorator:of:do:'' stamps the decorator's node for the
decorator's application only, so a frame inside a decorator call reports the
decorator's own line (#1406, #1518); a constant's own stamp is cleared after
it too.  ``curPos:'' has no IR form: the helpers this backend builds are
declarative and never emit one, so it refuses."
Class {
	#name : 'ClassBuildIREmitter',
	#superclass : 'ClassBuildEmitter',
	#instVars : [
		'builder',
		'values',
		'opens',
		'scopes',
		'pre',
		'restOffset'
	],
	#category : 'Grail-Parser'
}

{ #category : 'instance creation' }
ClassBuildIREmitter class >> on: aPyMethodIRBuilder [

	^ self new ___setBuilder___: aPyMethodIRBuilder

]

{ #category : 'Grail-private' }
ClassBuildIREmitter >> ___arrayLiteral___: anArray [
	"A literal Array, invariant as the text compiler makes one."

	| arr |
	arr := Array withAll: anArray.
	arr immediateInvariant.
	^ self ___push___: (builder obj: arr)

]

{ #category : 'Grail-private' }
ClassBuildIREmitter >> ___bodyIn___: bodyBlock [
	"Evaluate bodyBlock inside the builder's innermost (just opened) block: the
	statements it emits are added there, and what it leaves on the stack -- at
	most one node, the body's value -- becomes the last statement."

	| mark |
	mark := values size.
	bodyBlock value.
	values size > (mark + 1) ifTrue: [
		^ self error: 'ClassBuildIREmitter: a body left '
			, (values size - mark) printString , ' values'].
	values size = (mark + 1) ifTrue: [builder add: values removeLast]

]

{ #category : 'Grail-private' }
ClassBuildIREmitter >> ___close___: aKind [
	"Pop the innermost open construct, refusing one of another kind, and answer
	its record."

	(opens isEmpty or: [(opens last at: 1) ~~ aKind]) ifTrue: [
		^ self error: 'ClassBuildIREmitter: close of ' , aKind printString
			, ' with ' , (opens collect: [:o | o at: 1]) asArray printString , ' open'].
	^ opens removeLast

]

{ #category : 'Grail-private' }
ClassBuildIREmitter >> ___closeValueBlock___: aKind [

	| rec blk |
	rec := self ___close___: aKind.
	blk := builder closeOpenBlock: (rec at: 2).
	scopes removeLast.
	builder add: (builder send: #value to: blk with: #() env: 0)

]

{ #category : 'Grail-private' }
ClassBuildIREmitter >> ___env___: anEnvOrNil [
	"The environment a send dispatches in: nil is the helper's own, env 1, as
	an unprefixed send in the text helper is."

	^ anEnvOrNil ifNil: [1]

]

{ #category : 'Grail-private' }
ClassBuildIREmitter >> ___eval___: aBlock [
	"Evaluate a sub-expression block and answer the ONE node it pushed."

	| mark |
	mark := values size.
	aBlock value.
	values size = (mark + 1) ifFalse: [
		^ self error: 'ClassBuildIREmitter: an expression block left '
			, (values size - mark) printString , ' values'].
	^ values removeLast

]

{ #category : 'Grail-private' }
ClassBuildIREmitter >> ___leafNamed___: aName [
	"The variable leaf aName resolves to in the helper, or nil for one that is
	not a variable of the helper (a pseudo-variable or a global)."

	| key |
	key := aName asString.
	scopes reverseDo: [:scope |
		(scope at: key otherwise: nil) ifNotNil: [:leaf | ^ leaf]].
	^ builder leafFor: key asSymbol

]

{ #category : 'Grail-private' }
ClassBuildIREmitter >> ___openValueBlock___: aKind temps: tempNames [

	| opened scope |
	opened := builder openBlockWithTemps: (tempNames collect: [:t | t asString asSymbol]).
	scope := KeyValueDictionary new.
	tempNames with: (opened at: 2) do: [:t :leaf | scope at: t asString put: leaf].
	scopes addLast: scope.
	opens addLast: { aKind. opened at: 1 }

]

{ #category : 'Grail-private' }
ClassBuildIREmitter >> ___push___: aNode [

	values addLast: aNode.
	^ aNode

]

{ #category : 'Grail-private' }
ClassBuildIREmitter >> ___rest___ [
	"Put the builder back at the machinery's position (restAt:), dropping any
	map entry a child node or a decorator armed and no send consumed."

	builder clearPosition.
	restOffset ifNotNil: [:ofs | builder at: ofs]

]

{ #category : 'Grail-private' }
ClassBuildIREmitter >> ___send___: aSelector env: anEnvOrNil to: rcvrBlock with: argBlocks [

	| rcvr args |
	rcvr := self ___eval___: rcvrBlock.
	args := argBlocks collect: [:b | self ___eval___: b].
	^ self ___push___: (builder
		send: aSelector asSymbol
		to: rcvr
		with: args asArray
		env: (self ___env___: anEnvOrNil))

]

{ #category : 'Grail-private' }
ClassBuildIREmitter >> ___setBuilder___: aBuilder [

	builder := aBuilder.
	aBuilder classBuildEmitter: self.
	values := OrderedCollection new.
	opens := OrderedCollection new.
	scopes := OrderedCollection new.
	pre := IdentityKeyValueDictionary new

]

{ #category : 'Grail-private' }
ClassBuildIREmitter >> ___symbolFor___: aName [
	"A name written bare inside a literal array, as the Smalltalk compiler reads
	it: ``true'', ``false'' and ``nil'' are those objects there, everything else
	a Symbol."

	| s |
	s := aName asString.
	s = 'true' ifTrue: [^ true].
	s = 'false' ifTrue: [^ false].
	s = 'nil' ifTrue: [^ nil].
	^ s asSymbol

]

{ #category : 'Grail-structure' }
ClassBuildIREmitter >> assertDepth: anInteger [

	opens size = anInteger ifFalse: [
		^ self error: 'ClassBuildIREmitter: ' , opens size printString
			, ' open where ' , anInteger printString , ' were expected']

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> assign: aName from: aBlock [

	| leaf value |
	leaf := self ___leafNamed___: aName.
	leaf isNil ifTrue: [
		^ self error: 'ClassBuildIREmitter: assignment to ' , aName asString
			, ', which is not a variable of the helper'].
	value := self ___eval___: aBlock.
	^ self ___push___: (builder assign: leaf from: value)

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> block: bodyBlock [

	^ self ___push___: (builder inBlockDo: [self ___bodyIn___: bodyBlock])

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> blockWithArgs: argNames temps: tempNames do: bodyBlock [

	| blk |
	blk := builder
		blockWithArgs: (argNames collect: [:a | a asString asSymbol]) asArray
		temps: (tempNames collect: [:t | t asString asSymbol]) asArray
		do: [:argLeaves :tempLeaves |
			| scope |
			scope := KeyValueDictionary new.
			argNames with: argLeaves do: [:n :leaf | scope at: n asString put: leaf].
			tempNames with: tempLeaves do: [:n :leaf | scope at: n asString put: leaf].
			scopes addLast: scope.
			[self ___bodyIn___: bodyBlock] ensure: [scopes removeLast]].
	^ self ___push___: blk

]

{ #category : 'Grail-literals' }
ClassBuildIREmitter >> boolean: aBoolean [

	^ self ___push___: (aBoolean ifTrue: [builder trueLit] ifFalse: [builder falseLit])

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> braceArray: elementBlocks [

	^ self ___push___: (builder arrayOf: (elementBlocks collect: [:b | self ___eval___: b]) asArray)

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> braceArrayOnNextLine: elementBlocks [

	^ self braceArray: elementBlocks

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> cascadeTo: rcvrBlock sends: specs [

	| rcvr built |
	rcvr := self ___eval___: rcvrBlock.
	built := specs collect: [:spec |
		{ (spec at: 1) asSymbol.
		  ((spec at: 2) collect: [:b | self ___eval___: b]) asArray.
		  self ___env___: (spec at: 3) }].
	^ self ___push___: (builder cascade: rcvr specs: built asArray)

]

{ #category : 'Grail-structure' }
ClassBuildIREmitter >> closeIfTrue [

	| rec blk |
	rec := self ___close___: #ifTrue.
	blk := builder closeOpenBlock: (rec at: 2).
	builder add: (builder send: #ifTrue: to: (rec at: 3) with: { blk } env: 1)

]

{ #category : 'Grail-structure' }
ClassBuildIREmitter >> closeValueBlock [

	self ___closeValueBlock___: #valueBlock

]

{ #category : 'Grail-structure' }
ClassBuildIREmitter >> closeValueBlockLine [

	self ___closeValueBlock___: #valueBlockLine

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> compactBraceArray: elementBlocks [

	^ self braceArray: elementBlocks

]

{ #category : 'Grail-literals' }
ClassBuildIREmitter >> compactStringArray: strings [

	^ self stringArray: strings

]

{ #category : 'Grail-statements' }
ClassBuildIREmitter >> curPos: aLine [
	"No IR form: see the class comment."

	^ self error: 'ClassBuildIREmitter: a ___curPos___ store (line '
		, aLine printString , ') in a class build built through IR'

]

{ #category : 'Grail-structure' }
ClassBuildIREmitter >> depth [

	^ opens size

]

{ #category : 'Grail-literals' }
ClassBuildIREmitter >> emptyArray [

	^ self ___arrayLiteral___: #()

]

{ #category : 'Grail-children' }
ClassBuildIREmitter >> expressionNode: anAst [
	"See the class comment: a value the caller evaluated, a constant, or a
	class-body value expression built by its own IR emitter."

	| node |
	(pre at: anAst otherwise: nil) ifNotNil: [:leaf |
		^ self ___push___: (builder var: leaf)].
	(anAst isKindOf: ConstantAst) ifFalse: [
		(anAst ___irEligibleValueLocals___: builder localNameSet) ifFalse: [
			^ self error: 'ClassBuildIREmitter: a ' , anAst class name asString
				, ' in the class body is not IR-eligible in the class-body context'].
		CallAst inClassBodyValueEmit == true ifFalse: [
			^ self error: 'ClassBuildIREmitter: a ' , anAst class name asString
				, ' outside the class body''s value emit']].
	node := anAst ___emitIRValueOn___: builder.
	self ___rest___.
	^ self ___push___: node

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> ifFalse: condBlock do: bodyBlock [

	| cond |
	cond := self ___eval___: condBlock.
	^ self ___push___: (builder
		send: #ifFalse:
		to: cond
		with: { builder inBlockDo: [self ___bodyIn___: bodyBlock] }
		env: 1)

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> ifNil: rcvrBlock env: anEnvOrNil temps: tempNames do: bodyBlock [
	"Inlined, as the compiler inlines ``ifNil:'' with a literal block.  An
	inlined block's temps are the method's anyway, so each temp is a temp of
	the helper, made once and shared by every such read -- the shape
	NameAst >> ___emitIRModuleFunctionReadOn___: gives ``___fn___'' in a
	method -- and visible to the body by name."

	| rcvr scope |
	rcvr := self ___eval___: rcvrBlock.
	scope := KeyValueDictionary new.
	tempNames do: [:t |
		scope at: t asString put: ((builder leafFor: t asString asSymbol)
			ifNil: [builder tempNamed: t asString asSymbol])].
	scopes addLast: scope.
	^ [self ___push___: (builder
			ifNilValue: rcvr
			then: [self ___bodyIn___: bodyBlock])]
		ensure: [scopes removeLast]

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> ifTrue: condBlock do: bodyBlock [

	| cond |
	cond := self ___eval___: condBlock.
	^ self ___push___: (builder
		send: #ifTrue:
		to: cond
		with: { builder inBlockDo: [self ___bodyIn___: bodyBlock] }
		env: 1)

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> ifTrue: condBlock do: thenBlock ifFalse: elseBlock [

	| cond thenBlk elseBlk |
	cond := self ___eval___: condBlock.
	thenBlk := builder inBlockDo: [self ___bodyIn___: thenBlock].
	elseBlk := builder inBlockDo: [self ___bodyIn___: elseBlock].
	^ self ___push___: (builder
		send: #ifTrue:ifFalse:
		to: cond
		with: { thenBlk. elseBlk }
		env: 1)

]

{ #category : 'Grail-statements' }
ClassBuildIREmitter >> ifTrue: condBlock inline: bodyBlock [

	builder add: (self ___eval___: [self ifTrue: condBlock do: bodyBlock])

]

{ #category : 'Grail-literals' }
ClassBuildIREmitter >> integer: anInteger [

	^ self ___push___: (builder obj: anInteger)

]

{ #category : 'Grail-children' }
ClassBuildIREmitter >> mapDecorator: aNode of: anOwner do: aBlock [
	"Stamp the decorator's node, so the send aBlock builds -- the decorator's
	application -- is attributed to the decorator's own line (#1406, #1518).
	The guard is the text's (AbstractLocationNode >> ___mapDecorator___:on:do:):
	a node with no full span, or one parsed out of an f-string, is not mapped."

	(aNode notNil
		and: [(aNode respondsTo: #___hasFullPositionSpan___)
		and: [aNode ___hasFullPositionSpan___
		and: [aNode ___hasFragmentPositions___ not]]])
			ifTrue: [builder atNode: aNode].
	^ [aBlock value] ensure: [self ___rest___]

]

{ #category : 'Grail-layout' }
ClassBuildIREmitter >> newline [

	^ self

]

{ #category : 'Grail-literals' }
ClassBuildIREmitter >> nilLiteral [

	^ self ___push___: builder nilLit

]

{ #category : 'Grail-structure' }
ClassBuildIREmitter >> openIfTrue: condBlock [

	| cond opened |
	cond := self ___eval___: condBlock.
	opened := builder openBlockWithTemps: #().
	scopes addLast: KeyValueDictionary new.
	opens addLast: { #ifTrue. opened at: 1. cond }

]

{ #category : 'Grail-structure' }
ClassBuildIREmitter >> openValueBlock: tempNames [

	self ___openValueBlock___: #valueBlock temps: tempNames

]

{ #category : 'Grail-structure' }
ClassBuildIREmitter >> openValueBlockLine: tempNames [

	self ___openValueBlock___: #valueBlockLine temps: tempNames

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> paren: aBlock [

	^ self ___push___: (self ___eval___: aBlock)

]

{ #category : 'Grail-children' }
ClassBuildIREmitter >> parenthesizedNode: anAst [

	^ self expressionNode: anAst

]

{ #category : 'Grail-literals' }
ClassBuildIREmitter >> plainSymbol: aString [

	^ self symbol: aString

]

{ #category : 'Grail-children' }
ClassBuildIREmitter >> pre: anAst at: aLeaf [
	"anAst was evaluated by the helper's caller, in the enclosing frame, and its
	value is held in the helper variable aLeaf: a child-node escape for it
	reads the variable."

	pre at: anAst put: aLeaf

]

{ #category : 'Grail-literals' }
ClassBuildIREmitter >> quotedSymbolArray: names [

	^ self ___arrayLiteral___: (names collect: [:n | n asString asSymbol]) asArray

]

{ #category : 'Grail-children' }
ClassBuildIREmitter >> restAt: aModuleOffset [
	"The position the class-build MACHINERY is stamped at, between the nodes
	that carry a Python position of their own: the first character of the
	attached slice's ``# line'' trailer (ClassDefAst >>
	___irBuildClassHelper___:...), which BaseException >>
	___irPythonLineForMethod___:ip: reads as NO Python line.  So a frame paused
	in the machinery -- the subclass mint, __prepare__, the metaclass call,
	__init_subclass__ -- is not a Python frame, as CPython runs all of that in
	__build_class__ with no class-body frame, and an error there is reported
	against the enclosing frame's ``class'' line.  (A step point with no
	position at all reads as the slice's FIRST line, which would name the
	frame.)"

	restOffset := aModuleOffset.
	self ___rest___

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> send: aSelector env: anEnvOrNil to: rcvrBlock [

	^ self ___send___: aSelector env: anEnvOrNil to: rcvrBlock with: #()

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> send: aSelector env: anEnvOrNil to: rcvrBlock with: argBlocks [

	^ self ___send___: aSelector env: anEnvOrNil to: rcvrBlock with: argBlocks

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> sendOnNextLine: aSelector env: anEnvOrNil to: rcvrBlock with: argBlocks [

	^ self ___send___: aSelector env: anEnvOrNil to: rcvrBlock with: argBlocks

]

{ #category : 'Grail-layout' }
ClassBuildIREmitter >> space [

	^ self

]

{ #category : 'Grail-statements' }
ClassBuildIREmitter >> statement: aBlock [

	builder add: (self ___eval___: aBlock)

]

{ #category : 'Grail-children' }
ClassBuildIREmitter >> statementNode: anAst [

	^ self error: 'ClassBuildIREmitter: a ' , anAst class name asString
		, ' statement in the class build needs the class-body namespace in IR'

]

{ #category : 'Grail-statements' }
ClassBuildIREmitter >> statementWithoutNewline: aBlock [

	^ self statement: aBlock

]

{ #category : 'Grail-literals' }
ClassBuildIREmitter >> string: aString [
	"An invariant String literal, as the text compiler makes one."

	| s |
	s := aString copy.
	s immediateInvariant.
	^ self ___push___: (builder obj: s)

]

{ #category : 'Grail-literals' }
ClassBuildIREmitter >> stringArray: strings [

	^ self ___arrayLiteral___: (strings collect: [:s |
		| str |
		str := s asString copy.
		str immediateInvariant.
		str]) asArray

]

{ #category : 'Grail-literals' }
ClassBuildIREmitter >> stringIndentedByStream: aString [
	"The plain literal: see the class comment."

	^ self string: aString

]

{ #category : 'Grail-literals' }
ClassBuildIREmitter >> symbol: aString [

	^ self ___push___: (builder obj: aString asString asSymbol)

]

{ #category : 'Grail-literals' }
ClassBuildIREmitter >> symbolArray: names [

	^ self ___arrayLiteral___: (names collect: [:n | self ___symbolFor___: n]) asArray

]

{ #category : 'Grail-literals' }
ClassBuildIREmitter >> symbolPairArray: pairs [

	^ self ___arrayLiteral___: (pairs collect: [:p |
		| inner |
		inner := Array withAll: (p collect: [:n | self ___symbolFor___: n]).
		inner immediateInvariant.
		inner]) asArray

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> terminatedBraceArray: elementBlocks [

	^ self braceArray: elementBlocks

]

{ #category : 'Grail-children' }
ClassBuildIREmitter >> valueOf: aBlock [
	"The ONE node aBlock pushes through this emitter, popped and answered --
	how a child node's IR emit hands a construct to the class build's
	emitter and takes its value back (NameAst >> ___emitIRValueOn___:'s
	class-body read)."

	^ self ___eval___: aBlock

]

{ #category : 'Grail-expressions' }
ClassBuildIREmitter >> var: aName [

	| s |
	(self ___leafNamed___: aName) ifNotNil: [:leaf | ^ self ___push___: (builder var: leaf)].
	s := aName asString.
	s = 'self' ifTrue: [^ self ___push___: builder selfNode].
	s = 'nil' ifTrue: [^ self ___push___: builder nilLit].
	s = 'true' ifTrue: [^ self ___push___: builder trueLit].
	s = 'false' ifTrue: [^ self ___push___: builder falseLit].
	^ self ___push___: (builder globalNamed: s asSymbol)

]
