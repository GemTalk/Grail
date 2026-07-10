! ------------------- Superclass check
run
AbstractNode ifNil: [self error: 'AbstractNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for SuiteAst
expectvalue /Class
doit
AbstractNode subclass: 'SuiteAst'
  instVarNames: #( body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
SuiteAst comment:
'Grail-specific helper class for managing statement suites.

This is not a standard Python AST node, but a Grail implementation detail for managing collections of statements and their associated variables.

body is a list of statement nodes.
variables tracks variable declarations in the suite.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      SuiteAst(body variables)
'
%

! ------------------- Remove existing behavior from SuiteAst
removeallmethods SuiteAst
removeallclassmethods SuiteAst

set compile_env: 0

category: 'Grail-other'
method: SuiteAst
body

	^body
%

category: 'Grail-other'
method: SuiteAst
printSmalltalkOn: aStream

	body do: [:stmt |
		stmt printSmalltalkOn: aStream.
		aStream lf.
		"See BlockAst>>printSmalltalkOn:useTemps: -- dead code after a
		top-level `return` is a Smalltalk syntax error after ^."
		stmt isUnconditionalReturn ifTrue: [^ self].
	].
%

category: 'Grail-other'
method: SuiteAst
size


	^body size
%
