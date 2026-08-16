! ------------------- Superclass check
run
PatternAst ifNil: [self error: 'PatternAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for MatchClassAst
expectvalue /Class
doit
PatternAst subclass: 'MatchClassAst'
  instVarNames: #( cls patterns kwdAttrs kwdPatterns)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
MatchClassAst comment:
'https://docs.python.org/3/library/ast.html#ast.MatchClass

``case Point(0, y=1):''.

An isinstance test first, then POSITIONAL sub-patterns resolved through
the class''s ``__match_args__'' tuple, then keyword sub-patterns read as
plain attributes.  A class with no ``__match_args__'' accepts no
positional patterns -- that is a TypeError in CPython, raised at match
time rather than a silent non-match, and ___matchArgAt___:of: keeps it
that way.

The builtins that PEP 634 gives a single ``self'' match arg (int, str,
list, dict, ...) are handled by the same helper, so ``case int(x):''
binds x to the subject itself.
'
%

expectvalue /Class
doit
MatchClassAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from MatchClassAst
removeallmethods MatchClassAst
removeallclassmethods MatchClassAst

set compile_env: 0

category: 'Grail-match'
method: MatchClassAst
printMatchTestOn: aStream subject: aName depth: anInteger
	"isinstance gate, then positional args via __match_args__, then
	keyword args as attributes.  Every step is inside and: so a failed
	isinstance never reaches an attribute read that would raise."

	| sub |
	sub := self subjectNameAt: anInteger + 1.
	"The isinstance test must close its own parentheses BEFORE the and:
	chain, or ``S ___matchIsInstanceOf___: C and: [...]'' fuses into the
	single selector ___matchIsInstanceOf___:and:.  It only showed up once
	a class pattern carried sub-patterns: ``case str():'' has no and: to
	fuse with."
	aStream nextPutAll: '((', aName, ' ___matchIsInstanceOf___: '.
	cls printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ')'.
	1 to: patterns size do: [:i |
		aStream nextPutAll: ' and: [([:', sub, ' | (', sub, ' @env0:~~ #''___matchMiss___'') and: ['.
		(patterns at: i) printMatchTestOn: aStream subject: sub depth: anInteger + 1.
		aStream nextPutAll: ']] @env0:value: (', aName, ' ___matchArgAt___: ', (i - 1) printString, ' of: '.
		cls printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: '))'].
	1 to: kwdAttrs size do: [:i |
		aStream nextPutAll: ' and: [([:', sub, ' | (', sub, ' @env0:~~ #''___matchMiss___'') and: ['.
		(kwdPatterns at: i) printMatchTestOn: aStream subject: sub depth: anInteger + 1.
		aStream nextPutAll: ']] @env0:value: (', aName, ' ___matchAttr___: '''.
		aStream nextPutAll: (kwdAttrs at: i) asString.
		aStream nextPutAll: '''))'].
	(patterns size + kwdAttrs size) timesRepeat: [aStream nextPutAll: ']'].
	aStream nextPutAll: ')'
%

method: MatchClassAst
cls
	^cls
%

method: MatchClassAst
cls: newValue
	cls := newValue
%

method: MatchClassAst
patterns
	^patterns
%

method: MatchClassAst
patterns: newValue
	patterns := newValue
%

method: MatchClassAst
kwdAttrs
	^kwdAttrs
%

method: MatchClassAst
kwdAttrs: newValue
	kwdAttrs := newValue
%

method: MatchClassAst
kwdPatterns
	^kwdPatterns
%

method: MatchClassAst
kwdPatterns: newValue
	kwdPatterns := newValue
%
