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
		"Track the current execution position before each statement so a
		traceback frame built while this statement runs (e.g. a raise inside a
		try / loop / if body -- all of which are SuiteAsts) points at the raising
		line, not the enclosing compound-statement header.  Mirrors
		BlockAst>>printSmalltalkOn:useTemps:; no-ops outside a function."
		self ___emitCurPosBefore: stmt on: aStream.
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
method: SuiteAst
body: newValue
	body := newValue
%

category: 'Grail-IR Codegen'
method: SuiteAst
___emitIRStatementsOn___: aBuilder
	"Emit each statement into the current builder context; stop after an
	unconditional return (same dead-code rule as printSmalltalkOn:)."

	body do: [:stmt |
		stmt ___emitIRStatementOn___: aBuilder.
		stmt isUnconditionalReturn ifTrue: [^ self]].
	^ self
%

category: 'Grail-IR Codegen'
method: SuiteAst
___irEligibleStatementsWithLocals___: localNames
	^ body allSatisfy: [:stmt | stmt ___irEligibleStatementLocals___: localNames]
%

category: 'Grail-IR Codegen'
method: SuiteAst
___irReadLocalNamesInto___: aSet locals: localSet
	body do: [:stmt | stmt ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%

category: 'Grail-IR Codegen'
method: SuiteAst
___irWriteLocalNamesInto___: aSet locals: localSet
	body do: [:stmt | stmt ___irWriteLocalNamesInto___: aSet locals: localSet].
	^ self
%
