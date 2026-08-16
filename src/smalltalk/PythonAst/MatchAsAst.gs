! ------------------- Superclass check
run
PatternAst ifNil: [self error: 'PatternAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for MatchAsAst
expectvalue /Class
doit
PatternAst subclass: 'MatchAsAst'
  instVarNames: #( pattern name)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
MatchAsAst comment:
'https://docs.python.org/3/library/ast.html#ast.MatchAs

Three shapes share this node, as they do in CPython''s AST:

  case _:          pattern nil, name nil   -- wildcard, always matches
  case x:          pattern nil, name ''x'' -- capture, always matches
  case P as x:     pattern P,   name ''x'' -- match P, then bind

The binding happens only AFTER the inner pattern succeeds, which is what
makes ``case [1, y] as whole:'' bind ``whole'' only for a real match.
'
%

expectvalue /Class
doit
MatchAsAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from MatchAsAst
removeallmethods MatchAsAst
removeallclassmethods MatchAsAst

set compile_env: 0

category: 'Grail-match'
method: MatchAsAst
printMatchTestOn: aStream subject: aName depth: anInteger
	"A capture binds and answers true; a wildcard just answers true.
	``P as x'' guards the bind behind P's own test, and uses and: so the
	bind is not evaluated when P fails."

	pattern isNil
		ifTrue: [
			name isNil ifTrue: [^ aStream nextPutAll: 'true'].
			"A BLOCK, not parentheses: Smalltalk parentheses group ONE
			expression, so ``(x := s. true)'' is a parse error, not a
			bind-then-answer-true.  A block is the only grouping that takes
			a statement sequence, and #value evaluates it in place."
			aStream nextPutAll: '['.
			self emitNameStoreOn: aStream target: name rhs: aName.
			^ aStream nextPutAll: '. true] @env0:value'].
	aStream nextPutAll: '('.
	pattern printMatchTestOn: aStream subject: aName depth: anInteger.
	name isNil ifTrue: [^ aStream nextPutAll: ')'].
	aStream nextPutAll: ' and: ['.
	self emitNameStoreOn: aStream target: name rhs: aName.
	aStream nextPutAll: '. true])'
%

method: MatchAsAst
pattern
	^pattern
%

method: MatchAsAst
pattern: newValue
	pattern := newValue
%

method: MatchAsAst
name
	^name
%

method: MatchAsAst
name: newValue
	name := newValue
%
