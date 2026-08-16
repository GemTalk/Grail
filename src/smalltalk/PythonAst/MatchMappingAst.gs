! ------------------- Superclass check
run
PatternAst ifNil: [self error: 'PatternAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for MatchMappingAst
expectvalue /Class
doit
PatternAst subclass: 'MatchMappingAst'
  instVarNames: #( keys patterns rest)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
MatchMappingAst comment:
'https://docs.python.org/3/library/ast.html#ast.MatchMapping

``case {''x'': v, **others}:''.

A mapping pattern matches on a SUBSET: extra keys in the subject are
fine, which is the opposite of a sequence pattern''s exact-length rule.
``**rest'' binds a dict of the keys the pattern did not name.
'
%

expectvalue /Class
doit
MatchMappingAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from MatchMappingAst
removeallmethods MatchMappingAst
removeallclassmethods MatchMappingAst

set compile_env: 0

category: 'Grail-match'
method: MatchMappingAst
printMatchTestOn: aStream subject: aName depth: anInteger
	"Every named key must be PRESENT and its value must match; unnamed
	keys in the subject are ignored (a mapping pattern is a subset test).
	Key presence is checked before the value is fetched so a missing key
	is a non-match, not a KeyError."

	| sub |
	sub := self subjectNameAt: anInteger + 1.
	aStream nextPutAll: '(', aName, ' ___matchIsMapping___'.
	1 to: keys size do: [:i |
		aStream nextPutAll: ' and: [(', aName, ' ___matchHasKey___: '.
		(keys at: i) printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ') and: [([:', sub, ' | '.
		(patterns at: i) printMatchTestOn: aStream subject: sub depth: anInteger + 1.
		aStream nextPutAll: '] @env0:value: (', aName, ' ___matchItemForKey___: '.
		(keys at: i) printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: '))'].
	rest isNil ifFalse: [
		aStream nextPutAll: ' and: ['.
		rest printSmalltalkOn: aStream.
		aStream nextPutAll: ' := ', aName, ' ___matchRestExcluding___: {'.
		1 to: keys size do: [:i |
			i > 1 ifTrue: [aStream nextPutAll: '. '].
			(keys at: i) printSmalltalkWithParenthesisOn: aStream].
		aStream nextPutAll: '}. true]'].
	"Two per key (the presence test and the value test); the ``**rest''
	clause closes its own bracket inline, so it must NOT be counted here."
	(keys size * 2) timesRepeat: [aStream nextPutAll: ']'].
	aStream nextPutAll: ')'
%

method: MatchMappingAst
keys
	^keys
%

method: MatchMappingAst
keys: newValue
	keys := newValue
%

method: MatchMappingAst
patterns
	^patterns
%

method: MatchMappingAst
patterns: newValue
	patterns := newValue
%

method: MatchMappingAst
rest
	^rest
%

method: MatchMappingAst
rest: newValue
	rest := newValue
%
