"The interface ClassDefAst writes a class statement's BUILD through: the
run-time code that mints the class, compiles its methods and tables, runs the
body's statements, the metaclass and the decorators, and binds the name
(ClassDefAst >> printSmalltalkRuntimeWith:).

ONE EMITTER, TWO OUTPUTS.  The class build is the bulk of every module body's
generated code -- 94-98% of the module-body text compiled (P0.2's census) --
and a second, hand-written IR copy of a text emitter drifts from the text it
copies.  So the emitter is written once, against this protocol, and the output
is the backend's business: ClassBuildTextEmitter writes the Smalltalk source
the class build has always been, byte for byte; an IR backend builds the same
code as GsCompilerIRNode trees through PyMethodIRBuilder.

EVERY OPERATION IS A SMALLTALK CONSTRUCT, evaluated IN SOURCE ORDER.
Sub-expressions are zero-argument blocks the backend evaluates where the
construct puts them (receiver, then each argument), so a text backend can
stream -- which it must: a child AST node's emitter writes straight onto the
stream and records position-map entries against stream offsets, so nothing can
be built out of order and spliced in.  An IR backend evaluates the same blocks
and uses what each answers as the node.

Some operations exist only because the text has more than one spelling of one
construct: ``openValueBlock:'' and ``openValueBlockLine:'' are the same real
block with temps sent ``@env0:value''; ``braceArray:'' and
``compactBraceArray:'' the same ``{ }''; ``symbolArray:'', ``quotedSymbolArray:''
and the string arrays are each a literal Array.  An IR backend implements each
pair once.  The layout-only operations (``newline'', ``space'') are no-ops for
it.  None of that is normalised away here, because the text backend's contract
is that the generated text does not change.

OPEN / CLOSE PAIRS (``openValueBlock:'' / ``closeValueBlock'',
``openIfTrue:'' / ``closeIfTrue'') bracket constructs whose body is hundreds of
lines of the emitter apart -- the block the class is built in, the canonical
guard -- so they are a stack rather than a block argument.  Both backends keep
the stack and refuse a close that does not match the open; ``depth'' and
``assertDepth:'' let an emit check that it closed what it opened.

ESCAPES.  Two operations hand the construct to something else:
``expressionNode:'' / ``parenthesizedNode:'' / ``statementNode:'' embed a
CHILD AST node, which has its own text and IR emitters; ``unrouted:'' hands
the text stream to a ClassDefAst helper that has not been moved onto this
protocol yet.  Every ``unrouted:'' is a place an IR backend cannot follow, and
the list of them is the remaining work."
Class {
	#name : 'ClassBuildEmitter',
	#superclass : 'Object',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-structure' }
ClassBuildEmitter >> assertDepth: anInteger [
	"Refuse unless exactly anInteger open/close pairs are open: an emit that
	took ``depth'' on entry asserts it on exit, so a pair it left open (or
	closed twice) fails where it happened."

	^ self subclassResponsibility

]

{ #category : 'Grail-expressions' }
ClassBuildEmitter >> assign: aName from: aBlock [
	"``<aName> := <aBlock's expression>''.  aName is a temp of the build (the
	class variable, a header temp) or of the enclosing method."

	^ self subclassResponsibility

]

{ #category : 'Grail-literals' }
ClassBuildEmitter >> boolean: aBoolean [
	"The literal ``true'' or ``false''."

	^ self subclassResponsibility

]

{ #category : 'Grail-expressions' }
ClassBuildEmitter >> braceArray: elementBlocks [
	"``{ e1. e2 }'' -- an Array built at run time."

	^ self subclassResponsibility

]

{ #category : 'Grail-expressions' }
ClassBuildEmitter >> cascadeTo: rcvrBlock sends: specs [
	"``rcvr sel1: a; sel2''.  specs are ``{ selector. argBlocks. envOrNil }''
	triples -- PyMethodIRBuilder >> cascade:specs:'s shape."

	^ self subclassResponsibility

]

{ #category : 'Grail-structure' }
ClassBuildEmitter >> closeIfTrue [
	"Close the statement openIfTrue: opened."

	^ self subclassResponsibility

]

{ #category : 'Grail-structure' }
ClassBuildEmitter >> closeValueBlock [
	"Close the block openValueBlock: opened and send it ``@env0:value'', as a
	statement."

	^ self subclassResponsibility

]

{ #category : 'Grail-structure' }
ClassBuildEmitter >> closeValueBlockLine [
	"Close the block openValueBlockLine: opened, as closeValueBlock does."

	^ self subclassResponsibility

]

{ #category : 'Grail-expressions' }
ClassBuildEmitter >> compactBraceArray: elementBlocks [
	"``{e1. e2}'' -- braceArray: in its other spelling."

	^ self subclassResponsibility

]

{ #category : 'Grail-literals' }
ClassBuildEmitter >> compactStringArray: strings [
	"A literal Array of Strings, ``#('a' 'b' )''."

	^ self subclassResponsibility

]

{ #category : 'Grail-statements' }
ClassBuildEmitter >> curPos: aLine [
	"Note that what follows runs at Python line aLine: the text's
	``___curPos___ := <aLine>.'' statement, a source position for IR."

	^ self subclassResponsibility

]

{ #category : 'Grail-structure' }
ClassBuildEmitter >> depth [
	"How many open/close pairs are open."

	^ self subclassResponsibility

]

{ #category : 'Grail-literals' }
ClassBuildEmitter >> emptyArray [
	"The literal ``#()''."

	^ self subclassResponsibility

]

{ #category : 'Grail-children' }
ClassBuildEmitter >> expressionNode: anAst [
	"A child node's expression, as the node emits it."

	^ self subclassResponsibility

]

{ #category : 'Grail-statements' }
ClassBuildEmitter >> ifTrue: condBlock inline: bodyBlock [
	"The statement ``<cond> ifTrue: [<body>]'', body one expression."

	^ self subclassResponsibility

]

{ #category : 'Grail-literals' }
ClassBuildEmitter >> integer: anInteger [
	"An integer literal."

	^ self subclassResponsibility

]

{ #category : 'Grail-children' }
ClassBuildEmitter >> mapDecorator: aNode of: anOwner do: aBlock [
	"Evaluate aBlock, which emits a decorator's application, attributing it to
	aNode for the frame's line (AbstractLocationNode >> ___mapDecorator___:on:do:)."

	^ self subclassResponsibility

]

{ #category : 'Grail-layout' }
ClassBuildEmitter >> newline [
	"End the line: layout only."

	^ self subclassResponsibility

]

{ #category : 'Grail-literals' }
ClassBuildEmitter >> nilLiteral [
	"The literal ``nil''."

	^ self subclassResponsibility

]

{ #category : 'Grail-structure' }
ClassBuildEmitter >> openIfTrue: condBlock [
	"Open the statement ``<cond> ifTrue: [ ... ]'', whose body is the
	statements emitted until the matching closeIfTrue."

	^ self subclassResponsibility

]

{ #category : 'Grail-structure' }
ClassBuildEmitter >> openValueBlock: tempNames [
	"Open a REAL block declaring tempNames, whose body is the statements emitted
	until the matching closeValueBlock -- the block a class is built in."

	^ self subclassResponsibility

]

{ #category : 'Grail-structure' }
ClassBuildEmitter >> openValueBlockLine: tempNames [
	"openValueBlock: in its other spelling, closed by closeValueBlockLine."

	^ self subclassResponsibility

]

{ #category : 'Grail-expressions' }
ClassBuildEmitter >> paren: aBlock [
	"``( <aBlock's expression> )''.  Grouping only: an IR backend answers the
	expression itself."

	^ self subclassResponsibility

]

{ #category : 'Grail-children' }
ClassBuildEmitter >> parenthesizedNode: anAst [
	"A child node's expression, parenthesised where its text needs it."

	^ self subclassResponsibility

]

{ #category : 'Grail-literals' }
ClassBuildEmitter >> plainSymbol: aString [
	"A Symbol literal in its bare spelling, ``#new'' or ``#withAll:'' --
	symbol: in its other spelling."

	^ self subclassResponsibility

]

{ #category : 'Grail-literals' }
ClassBuildEmitter >> quotedSymbolArray: names [
	"A literal Array of Symbols, ``#( #'a' #'b' )''."

	^ self subclassResponsibility

]

{ #category : 'Grail-expressions' }
ClassBuildEmitter >> send: aSelector env: anEnvOrNil to: rcvrBlock [
	"A unary send.  anEnvOrNil names the environment to dispatch in; nil is the
	enclosing method's own (no ``@env'' prefix in the text)."

	^ self subclassResponsibility

]

{ #category : 'Grail-expressions' }
ClassBuildEmitter >> send: aSelector env: anEnvOrNil to: rcvrBlock with: argBlocks [
	"A binary or keyword send, one argument block per argument."

	^ self subclassResponsibility

]

{ #category : 'Grail-layout' }
ClassBuildEmitter >> space [
	"A space between statements: layout only."

	^ self subclassResponsibility

]

{ #category : 'Grail-statements' }
ClassBuildEmitter >> statement: aBlock [
	"One statement: aBlock's expression, terminated, on a line of its own."

	^ self subclassResponsibility

]

{ #category : 'Grail-children' }
ClassBuildEmitter >> statementNode: anAst [
	"A child node's statement(s), as the node emits them."

	^ self subclassResponsibility

]

{ #category : 'Grail-statements' }
ClassBuildEmitter >> statementWithoutNewline: aBlock [
	"statement: with the line left open, for a layout that continues it."

	^ self subclassResponsibility

]

{ #category : 'Grail-literals' }
ClassBuildEmitter >> string: aString [
	"A String literal."

	^ self subclassResponsibility

]

{ #category : 'Grail-literals' }
ClassBuildEmitter >> stringArray: strings [
	"A literal Array of Strings, ``#( 'a' 'b' )''."

	^ self subclassResponsibility

]

{ #category : 'Grail-literals' }
ClassBuildEmitter >> symbol: aString [
	"A Symbol literal."

	^ self subclassResponsibility

]

{ #category : 'Grail-literals' }
ClassBuildEmitter >> symbolArray: names [
	"A literal Array of Symbols, ``#( a b )''."

	^ self subclassResponsibility

]

{ #category : 'Grail-literals' }
ClassBuildEmitter >> symbolPairArray: pairs [
	"A literal Array of two-Symbol Arrays, ``#( #( a b ) #( c d ) )''."

	^ self subclassResponsibility

]

{ #category : 'Grail-children' }
ClassBuildEmitter >> unrouted: aOneArgBlock [
	"Hand the TEXT stream to a ClassDefAst helper not yet written through this
	protocol.  The text backend evaluates aOneArgBlock with its stream; an IR
	backend cannot, which is what makes each send of this a to-do."

	^ self subclassResponsibility

]

{ #category : 'Grail-expressions' }
ClassBuildEmitter >> var: aName [
	"A read of the variable, global or pseudo-variable spelled aName."

	^ self subclassResponsibility

]
