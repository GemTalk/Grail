! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for MatchAst
expectvalue /Class
doit
StatementAst subclass: 'MatchAst'
  instVarNames: #( subject cases)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
MatchAst comment:
'https://docs.python.org/3/library/ast.html#ast.Match

PEP 634 structural pattern matching:

    match subject:
        case P1 if G: BODY1
        case P2:      BODY2

Compiles to a block applied to the subject, so the subject expression is
evaluated EXACTLY ONCE however many cases are tried, followed by a chain
of ifTrue:ifFalse:.  A match statement with no matching case is not an
error in Python -- it simply does nothing, which is the trailing nil.

A Smalltalk block''s ^ is always non-local, so a ``return'' inside a case
body still returns from the enclosing function, and break/continue keep
working because Grail signals those as exceptions rather than using
Smalltalk loop control.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        MatchAst(subject cases)
'
%

expectvalue /Class
doit
MatchAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from MatchAst
removeallmethods MatchAst
removeallclassmethods MatchAst

set compile_env: 0

category: 'Grail-other'
method: MatchAst
printSmalltalkOn: aStream
	"One block, one subject evaluation, then a decision chain.

	The subject is bound to a depth-0 temp so every pattern tests the SAME
	value -- re-emitting the subject expression per case would evaluate it
	once per case, and ``match next(it):'' would consume the iterator on
	every failed case."

	| subj |
	subj := '___msub0___'.
	aStream nextPutAll: '[:', subj, ' |'; lf; increaseIndent.
	1 to: cases size do: [:i |
		aStream nextPutAll: '('.
		(cases at: i) printMatchTestOn: aStream subject: subj depth: 0.
		aStream nextPutAll: ') ifTrue: ['; lf; increaseIndent.
		(cases at: i) body printSmalltalkOn: aStream.
		aStream lf; decreaseIndent; nextPutAll: '] ifFalse: ['; lf; increaseIndent].
	aStream nextPutAll: 'nil'.
	cases size timesRepeat: [aStream decreaseIndent; lf; nextPutAll: ']'].
	aStream decreaseIndent; lf; nextPutAll: '] @env0:value: ('.
	subject printSmalltalkOn: aStream.
	aStream nextPutAll: ').'
%

method: MatchAst
subject
	^subject
%

method: MatchAst
subject: newValue
	subject := newValue
%

method: MatchAst
cases
	^cases
%

method: MatchAst
cases: newValue
	cases := newValue
%

category: 'Grail-IR Codegen'
method: MatchAst
___irEligibleStatementLocals___: localNames
	"printSmalltalkOn:'s shape: one block over the subject, then a decision
	chain.  Every case's pattern must be emittable and so must every body."

	(subject ___irEligibleValueLocals___: localNames) ifFalse: [^ false].
	^ cases allSatisfy: [:c | c ___irMatchCaseEligible___: localNames]
%

category: 'Grail-IR Codegen'
method: MatchAst
___emitIRStatementOn___: aBuilder
	"``[:___msub0___ | (test1) ifTrue: [body1] ifFalse: [...]] @env0:value: (subject)''.

	The subject is bound to the block's ARGUMENT, not re-emitted per case:
	re-emitting it would evaluate it once per case, and ``match next(it):''
	would consume the iterator on every failed case.  In the text that binding
	is a named depth-0 temp; here it is the block argument leaf itself, passed
	down the pattern walk, so no name has to be invented or kept unique."

	| blk subjV |
	blk := aBuilder blockWithArg: #'___msub0___' do: [:subjLeaf |
		self ___emitIRCaseChainFrom___: 1 subject: subjLeaf on: aBuilder].
	subjV := subject ___emitIRValueOn___: aBuilder.
	aBuilder atNode: self.
	^ aBuilder add: (aBuilder send: #value: to: blk with: { subjV } env: 0)
%

category: 'Grail-IR Codegen'
method: MatchAst
___emitIRCaseChainFrom___: i subject: subjLeaf on: aBuilder
	"Case i's test, with every later case in its ifFalse:.  The text's chain
	bottoms out in ``nil'', which as a statement is nothing, so the last
	ifFalse: is simply omitted."

	| test |
	i > cases size ifTrue: [^ self].
	test := (cases at: i) ___emitIRMatchTestOn___: aBuilder subject: subjLeaf.
	aBuilder atNode: self.
	i = cases size
		ifTrue: [aBuilder if: test then: [(cases at: i) body ___emitIRStatementsOn___: aBuilder]]
		ifFalse: [aBuilder
			if: test
			then: [(cases at: i) body ___emitIRStatementsOn___: aBuilder]
			else: [self ___emitIRCaseChainFrom___: i + 1 subject: subjLeaf on: aBuilder]].
	^ self
%

category: 'Grail-IR Codegen'
method: MatchAst
___irReadLocalNamesInto___: aSet locals: localSet
	subject ___irReadLocalNamesInto___: aSet locals: localSet.
	cases do: [:c | c ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%

category: 'Grail-IR Codegen'
method: MatchAst
___irWriteLocalNamesInto___: aSet locals: localSet
	"Only the BODIES, deliberately: a capture binds too, but which captures run
	depends on which case matches, so reporting them as bindings would let the
	flow proof drop an unbound guard a capture may never have satisfied.  No
	___irFlowBound___:locals: either, so a def containing a match is never
	proved flow-safe and every body local keeps the text's guard."

	cases do: [:c | c body ___irWriteLocalNamesInto___: aSet locals: localSet].
	^ self
%
