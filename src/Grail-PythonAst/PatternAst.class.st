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
PatternAst >> subjectNameAt: anInteger [
	"The Smalltalk temp name for a sub-pattern's subject at this nesting
	depth.  Distinct per depth so nested patterns do not shadow."

	^'___msub', anInteger printString, '___'

]
