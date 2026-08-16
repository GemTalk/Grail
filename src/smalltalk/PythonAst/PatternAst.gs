! ------------------- Superclass check
run
AbstractLocationNode ifNil: [self error: 'AbstractLocationNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for PatternAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'PatternAst'
  instVarNames: #( )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
PatternAst comment:
'Abstract base for the PEP 634 ``match'' patterns.

A pattern is neither a statement nor an expression: it is compiled to a
Smalltalk BOOLEAN EXPRESSION that answers whether the subject matches, and
that performs any name bindings as a side effect while it runs.  That is
CPython''s model too -- a pattern that fails PART way through leaves the
names it already bound bound (PEP 634 leaves this explicitly unspecified,
and CPython does not undo them), so binding eagerly is conformant.

The protocol is:

    printMatchTestOn: aStream subject: aName depth: anInteger

``aName'' is the Smalltalk variable holding the value to test.  ``depth''
makes nested sub-pattern temporaries unique -- without it a sequence
pattern inside a sequence pattern would shadow the outer block argument.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      PatternAst
'
%

expectvalue /Class
doit
PatternAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from PatternAst
removeallmethods PatternAst
removeallclassmethods PatternAst

set compile_env: 0

category: 'Grail-match'
method: PatternAst
printMatchTestOn: aStream subject: aName depth: anInteger
	"Subclass responsibility."

	self error: 'printMatchTestOn:subject:depth: not implemented by ',
		self class name
%

category: 'Grail-match'
method: PatternAst
subjectNameAt: anInteger
	"The Smalltalk temp name for a sub-pattern's subject at this nesting
	depth.  Distinct per depth so nested patterns do not shadow."

	^'___msub', anInteger printString, '___'
%

