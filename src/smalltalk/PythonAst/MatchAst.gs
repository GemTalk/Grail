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
