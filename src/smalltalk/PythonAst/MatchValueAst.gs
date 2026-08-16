! ------------------- Superclass check
run
PatternAst ifNil: [self error: 'PatternAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for MatchValueAst
expectvalue /Class
doit
PatternAst subclass: 'MatchValueAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
MatchValueAst comment:
'https://docs.python.org/3/library/ast.html#ast.MatchValue

A literal or dotted-name pattern -- ``case 1:'', ``case ''a'':'',
``case Color.RED:''.  Compared with ``=='', not identity, exactly as
CPython does.

Bare names are NOT value patterns: ``case x:'' captures.  Only a DOTTED
name (``a.b'') is a value pattern, which is why the parser turns a bare
NAME into a MatchAsAst instead.
'
%

expectvalue /Class
doit
MatchValueAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from MatchValueAst
removeallmethods MatchValueAst
removeallclassmethods MatchValueAst

set compile_env: 0

category: 'Grail-match'
method: MatchValueAst
printMatchTestOn: aStream subject: aName depth: anInteger
	"``==''-comparison against the pattern's value.  Routed through
	___cmpEq___: rather than __eq__: so the full rich-compare protocol
	runs (reflected operand, NotImplemented fallback to identity) and the
	answer is a real Python bool -- __eq__: can answer the NotImplemented
	SENTINEL, whose ___isTruthy___ is simply true, which would make every
	unorderable comparison match."

	aStream nextPutAll: '(', aName, ' ___cmpEq___: '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ') ___isTruthy___'
%

method: MatchValueAst
value
	^value
%

method: MatchValueAst
value: newValue
	value := newValue
%
