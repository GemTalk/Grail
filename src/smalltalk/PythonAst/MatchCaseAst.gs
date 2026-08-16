! ------------------- Superclass check
run
AbstractLocationNode ifNil: [self error: 'AbstractLocationNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for MatchCaseAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'MatchCaseAst'
  instVarNames: #( pattern guard body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
MatchCaseAst comment:
'https://docs.python.org/3/library/ast.html#ast.match_case

One ``case P if G: BODY'' clause of a match statement.  The guard runs
only after the pattern matches, and therefore CAN see the names the
pattern just bound -- ``case [x, y] if x < y:'' is the point of guards.
'
%

expectvalue /Class
doit
MatchCaseAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from MatchCaseAst
removeallmethods MatchCaseAst
removeallclassmethods MatchCaseAst

set compile_env: 0

category: 'Grail-match'
method: MatchCaseAst
printMatchTestOn: aStream subject: aName depth: anInteger
	"Pattern first, then the guard -- in that order, and short-circuited,
	because the guard is allowed to reference names the pattern binds."

	guard isNil ifTrue: [
		^ pattern printMatchTestOn: aStream subject: aName depth: anInteger].
	aStream nextPutAll: '('.
	pattern printMatchTestOn: aStream subject: aName depth: anInteger.
	aStream nextPutAll: ' and: ['.
	guard printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ___isTruthy___])'
%

method: MatchCaseAst
pattern
	^pattern
%

method: MatchCaseAst
pattern: newValue
	pattern := newValue
%

method: MatchCaseAst
guard
	^guard
%

method: MatchCaseAst
guard: newValue
	guard := newValue
%

method: MatchCaseAst
body
	^body
%

method: MatchCaseAst
body: newValue
	body := newValue
%
