! ------------------- Superclass check
run
PatternAst ifNil: [self error: 'PatternAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for MatchSingletonAst
expectvalue /Class
doit
PatternAst subclass: 'MatchSingletonAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
MatchSingletonAst comment:
'https://docs.python.org/3/library/ast.html#ast.MatchSingleton

``case None:'', ``case True:'', ``case False:''.  PEP 634 requires these
three to be compared by IDENTITY, not ``=='' -- ``case True:'' must not
match the integer 1, though ``1 == True'' is true in Python.
'
%

expectvalue /Class
doit
MatchSingletonAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from MatchSingletonAst
removeallmethods MatchSingletonAst
removeallclassmethods MatchSingletonAst

set compile_env: 0

category: 'Grail-match'
method: MatchSingletonAst
printMatchTestOn: aStream subject: aName depth: anInteger
	"Identity, deliberately: PEP 634 specifies ``is'' for None/True/False
	so that ``case True:'' does not match 1 and ``case False:'' does not
	match 0 -- which ``=='' would, since bool is an int subclass."

	aStream nextPutAll: '(', aName, ' @env0:== '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ')'
%

method: MatchSingletonAst
value
	^value
%

method: MatchSingletonAst
value: newValue
	value := newValue
%
