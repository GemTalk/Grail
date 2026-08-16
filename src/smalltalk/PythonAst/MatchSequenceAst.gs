! ------------------- Superclass check
run
PatternAst ifNil: [self error: 'PatternAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for MatchSequenceAst
expectvalue /Class
doit
PatternAst subclass: 'MatchSequenceAst'
  instVarNames: #( patterns)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
MatchSequenceAst comment:
'https://docs.python.org/3/library/ast.html#ast.MatchSequence

``case [a, b]:'', ``case (a, *rest):'', ``case []:''.

The subject must be a SEQUENCE, and PEP 634 explicitly excludes str,
bytes and bytearray -- ``case [a, b]:'' must not match the string ''ab''.
That exclusion is the whole reason for the ___matchIsSequence___ helper
rather than a bare __len__/__getitem__ probe.

At most one ``*rest'' may appear, anywhere in the sequence.  Patterns
before it index from the FRONT and patterns after it index from the BACK,
so neither side needs to know the subject''s length.
'
%

expectvalue /Class
doit
MatchSequenceAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from MatchSequenceAst
removeallmethods MatchSequenceAst
removeallclassmethods MatchSequenceAst

set compile_env: 0

category: 'Grail-match'
method: MatchSequenceAst
starIndex
	"1-based position of the star pattern, or 0 when there is none."

	1 to: patterns size do: [:i |
		((patterns at: i) isKindOf: MatchStarAst) ifTrue: [^ i]].
	^ 0
%

category: 'Grail-match'
method: MatchSequenceAst
printMatchTestOn: aStream subject: aName depth: anInteger
	"Length gate first, then element tests, all short-circuited through
	and: so a failing element never evaluates the ones after it.

	Head patterns index from 0 up; tail patterns (after a star) index
	from -1 down, which is why the subject's length never has to appear
	in an element index."

	| star nFixed sub |
	star := self starIndex.
	nFixed := star = 0 ifTrue: [patterns size] ifFalse: [patterns size - 1].
	sub := self subjectNameAt: anInteger + 1.
	aStream nextPutAll: '(', aName, ' ___matchIsSequence___ and: ['.
	aStream nextPutAll: '(', aName, ' ___matchLen___) @env0:'.
	aStream nextPutAll: (star = 0 ifTrue: ['= '] ifFalse: ['>= ']).
	aStream nextPutAll: nFixed printString.
	1 to: patterns size do: [:i |
		| p |
		p := patterns at: i.
		aStream nextPutAll: ' and: ['.
		(p isKindOf: MatchStarAst)
			ifTrue: [
				"``*rest'' absorbs everything between the head patterns and
				the tail patterns.  CPython binds a LIST, never the subject's
				own type.  ``*_'' has no name and simply absorbs."
				p name isNil
					ifTrue: [aStream nextPutAll: 'true']
					ifFalse: [
						self emitNameStoreOn: aStream target: p name
							rhs: aName , ' ___matchStarSlice___: '
								, (i - 1) printString , ' fromEnd: '
								, (patterns size - i) printString.
						aStream nextPutAll: '. true']]
			ifFalse: [
				aStream nextPutAll: '([:', sub, ' | '.
				p printMatchTestOn: aStream subject: sub depth: anInteger + 1.
				aStream nextPutAll: '] @env0:value: (', aName, ' ___matchItemAt___: '.
				aStream nextPutAll: ((star = 0 or: [i < star])
					ifTrue: [(i - 1) printString]
					ifFalse: [(i - patterns size - 1) printString]).
				aStream nextPutAll: '))']].
	patterns size timesRepeat: [aStream nextPutAll: ']'].
	aStream nextPutAll: '])'
%

method: MatchSequenceAst
patterns
	^patterns
%

method: MatchSequenceAst
patterns: newValue
	patterns := newValue
%
