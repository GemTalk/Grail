! ------------------- Superclass check
run
PatternAst ifNil: [self error: 'PatternAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for MatchOrAst
expectvalue /Class
doit
PatternAst subclass: 'MatchOrAst'
  instVarNames: #( patterns)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
MatchOrAst comment:
'https://docs.python.org/3/library/ast.html#ast.MatchOr

``case 1 | 2 | 3:''.  Alternatives are tried left to right and the first
match wins, so later alternatives are not evaluated -- which matters,
because evaluating one can bind names.

PEP 634 requires every alternative to bind the SAME set of names; the
parser enforces that, so the emitted code does not have to.
'
%

expectvalue /Class
doit
MatchOrAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from MatchOrAst
removeallmethods MatchOrAst
removeallclassmethods MatchOrAst

set compile_env: 0

category: 'Grail-match'
method: MatchOrAst
printMatchTestOn: aStream subject: aName depth: anInteger
	"Short-circuit or:, so an alternative after the first match never
	runs -- a later alternative could otherwise rebind a captured name."

	aStream nextPutAll: '('.
	1 to: patterns size do: [:i |
		i > 1 ifTrue: [aStream nextPutAll: ' or: ['].
		(patterns at: i) printMatchTestOn: aStream subject: aName depth: anInteger].
	"NESTED, not sibling: ``a or: [b] or: [c]'' is the single selector
	or:or:, which nothing implements.  Each alternative has to open a new
	block that the next one closes -- and nesting is also what makes the
	short-circuit real."
	(patterns size - 1) timesRepeat: [aStream nextPutAll: ']'].
	aStream nextPutAll: ')'
%

method: MatchOrAst
patterns
	^patterns
%

method: MatchOrAst
patterns: newValue
	patterns := newValue
%

category: 'Grail-IR Codegen'
method: MatchOrAst
___irMatchTestEligible___: localNames
	^ patterns allSatisfy: [:p | p ___irMatchTestEligible___: localNames]
%

category: 'Grail-IR Codegen'
method: MatchOrAst
___emitIRMatchTestOn___: aBuilder subject: subjLeaf
	"Short-circuit or:, NESTED rather than sibling, so an alternative after the
	first match never runs -- a later alternative could otherwise rebind a
	captured name."

	^ self ___emitIROrFrom___: 1 subject: subjLeaf on: aBuilder
%

category: 'Grail-IR Codegen'
method: MatchOrAst
___emitIROrFrom___: i subject: subjLeaf on: aBuilder
	| test |
	test := (patterns at: i) ___emitIRMatchTestOn___: aBuilder subject: subjLeaf.
	i = patterns size ifTrue: [^ test].
	^ aBuilder orValue: test then: [
		aBuilder add: (self ___emitIROrFrom___: i + 1 subject: subjLeaf on: aBuilder)]
%

category: 'Grail-IR Codegen'
method: MatchOrAst
___irReadLocalNamesInto___: aSet locals: localSet
	patterns do: [:p | p ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%
