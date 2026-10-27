"Abstract base for the PEP 634 ``match' patterns.

A pattern is neither a statement nor an expression: it is compiled to a
Smalltalk BOOLEAN EXPRESSION that answers whether the subject matches, and
that performs any name bindings as a side effect while it runs.  That is
CPython's model too -- a pattern that fails PART way through leaves the
names it already bound bound (PEP 634 leaves this explicitly unspecified,
and CPython does not undo them), so binding eagerly is conformant.

The protocol is:

    printMatchTestOn: aStream subject: aName depth: anInteger

``aName' is the Smalltalk variable holding the value to test.  ``depth'
makes nested sub-pattern temporaries unique -- without it a sequence
pattern inside a sequence pattern would shadow the outer block argument.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      PatternAst

"
Class {
	#name : 'PatternAst',
	#superclass : 'AbstractLocationNode',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-match' }
PatternAst >> ___addCapture___: aNameAst into: aCollection [
	aNameAst isNil ifTrue: [^ self].
	(aCollection anySatisfy: [:each | each id = aNameAst id]) ifFalse: [aCollection add: aNameAst]

]

{ #category : 'Grail-validation' }
PatternAst >> ___bind___: aName into: boundNames at: aNode [
	"codegen_pattern_helper_store_name (Python/codegen.c:5741-5759): a case's
	pattern binds each name once."

	(boundNames includes: aName) ifTrue: [
		^ ModuleAst
			___syntaxError___: 'multiple assignments to name ''' , aName asString , ''' in pattern'
			node: aNode].
	boundNames add: aName

]

{ #category : 'Grail-match' }
PatternAst >> ___captureNodesInto___: aCollection [
	"Add the NameAst of every name this pattern captures, once per name, in
	order.  A value or singleton pattern captures nothing."

	^ self

]

{ #category : 'Grail-IR Codegen' }
PatternAst >> ___emitIRPendingCapture___: aNameAst from: rhsNode on: aBuilder [
	"printPendingCaptureOn:target:rhs:'s IR twin."

	^ aBuilder assign: (self ___irPendingCaptureLeafFor___: aNameAst on: aBuilder) from: rhsNode

]

{ #category : 'Grail-match' }
PatternAst >> ___enclosingMatch___ [
	"The match statement this pattern belongs to -- the nearest, for a
	pattern of a match nested in another's case body."

	| node |
	node := self parent.
	[node isNil or: [node isKindOf: MatchAst]] whileFalse: [node := node parent].
	^ node

]

{ #category : 'Grail-IR Codegen' }
PatternAst >> ___irPendingCaptureLeafFor___: aNameAst on: aBuilder [
	| temp |
	temp := (self ___pendingCaptureTempFor___: aNameAst) asSymbol.
	^ (aBuilder leafFor: temp) ifNil: [aBuilder tempNamed: temp]

]

{ #category : 'Grail-match' }
PatternAst >> ___pendingCaptureTempFor___: aNameAst [
	"The temp that holds what this pattern captures for aNameAst until the
	whole case pattern has matched (MatchAst >> ___pendingCaptureTempFor___:)."

	^ self ___enclosingMatch___ ___pendingCaptureTempFor___: aNameAst

]

{ #category : 'Grail-validation' }
PatternAst >> ___validateBinding___: boundNames irrefutableAllowed: aBoolean [
	"Raise the SyntaxError CPython's code generator raises for this pattern,
	if any (Python/codegen.c, codegen_pattern and the codegen_pattern_* it
	dispatches to).  boundNames collects the names the case binds so far;
	aBoolean says whether an irrefutable pattern may stand here, which only
	the last alternative of a case that is itself last or guarded may.  A
	singleton pattern binds nothing and can always fail."

	^ self

]

{ #category : 'Grail-match' }
PatternAst >> printMatchTestOn: aStream subject: aName depth: anInteger [
	"Subclass responsibility."

	self error: 'printMatchTestOn:subject:depth: not implemented by ',
		self class name

]

{ #category : 'Grail-match' }
PatternAst >> printPendingCaptureOn: aStream target: aNameAst rhs: rhsSource [
	"A capture's store, as an expression: into its pending temp, not into the
	name, which only its case's commit binds (MatchCaseAst >>
	printMatchTestOn:subject:depth:)."

	aStream
		nextPutAll: (self ___pendingCaptureTempFor___: aNameAst);
		nextPutAll: ' := (';
		nextPutAll: rhsSource;
		nextPutAll: ')'

]

{ #category : 'Grail-match' }
PatternAst >> subjectNameAt: anInteger [
	"The Smalltalk temp name for a sub-pattern's subject at this nesting
	depth.  Distinct per depth so nested patterns do not shadow."

	^'___msub', anInteger printString, '___'

]
