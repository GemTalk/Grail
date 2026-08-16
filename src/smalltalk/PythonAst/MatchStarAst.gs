! ------------------- Superclass check
run
PatternAst ifNil: [self error: 'PatternAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for MatchStarAst
expectvalue /Class
doit
PatternAst subclass: 'MatchStarAst'
  instVarNames: #( name)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
MatchStarAst comment:
'https://docs.python.org/3/library/ast.html#ast.MatchStar

The ``*rest'' of a sequence pattern.  Never tested on its own -- the
enclosing MatchSequenceAst handles it, because how much of the subject it
absorbs depends on how many fixed patterns sit on either side of it.
``case [*_]:'' has a nil name and simply absorbs without binding.
'
%

expectvalue /Class
doit
MatchStarAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from MatchStarAst
removeallmethods MatchStarAst
removeallclassmethods MatchStarAst

set compile_env: 0

category: 'Grail-match'
method: MatchStarAst
printMatchTestOn: aStream subject: aName depth: anInteger
	"A star pattern is meaningless outside a sequence pattern; the parser
	rejects that, so reaching here is an internal error, not user input."

	self error: 'a star pattern is only valid inside a sequence pattern'
%

method: MatchStarAst
name
	^name
%

method: MatchStarAst
name: newValue
	name := newValue
%
