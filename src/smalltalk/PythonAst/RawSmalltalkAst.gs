! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------- RawSmalltalkAst — an expression whose Smalltalk is already built
!
! A few statements bind a name to a value that the corresponding AST node
! already knows how to emit, but for which there is no Python expression
! node to hand to a consumer that wants one.  ``import json'' inside a
! CLASS BODY is the case that motivated this: the class-attribute pipeline
! (ClassDefAst >> classBodyAttributes) is driven by ``name -> value AST''
! pairs, and the value here is the importer call ImportAst emits, not
! anything the user wrote.
!
! Wrapping that source in a node lets imports flow through the ordinary
! class-attribute machinery -- accessor pair, declaration order, the
! ``Cls name: value'' init line -- instead of needing a parallel path.

expectvalue /Class
doit
ExpressionAst subclass: 'RawSmalltalkAst'
  instVarNames: #( source )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()
%

expectvalue /Class
doit
RawSmalltalkAst comment:
'An expression node that emits a pre-built Smalltalk source string verbatim.

Not produced by the parser -- only synthesised during code generation, where
a consumer needs an ExpressionAst but the value is Smalltalk that another
node already knows how to build.'
%

expectvalue /Class
doit
RawSmalltalkAst category: 'Grail-Ast'
%

set compile_env: 0

category: 'Grail-instance creation'
classmethod: RawSmalltalkAst
source: aString
	^ self new source: aString; yourself
%

category: 'Grail-accessing'
method: RawSmalltalkAst
source
	^ source
%

category: 'Grail-accessing'
method: RawSmalltalkAst
source: aString
	source := aString.
	^ self
%

category: 'Grail-code generation'
method: RawSmalltalkAst
printSmalltalkOn: aStream
	aStream nextPutAll: source
%
