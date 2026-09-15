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

category: 'Grail-IR Codegen'
method: MatchSequenceAst
___irMatchTestEligible___: localNames
	^ patterns allSatisfy: [:p | p ___irMatchTestEligible___: localNames]
%

category: 'Grail-IR Codegen'
method: MatchSequenceAst
___emitIRMatchTestOn___: aBuilder subject: subjLeaf
	"Length gate first, then element tests, all short-circuited through and: so
	a failing element never evaluates the ones after it.  Head patterns index
	from 0 up, tail patterns (after a star) from -1 down, so the subject's
	length never appears in an element index."

	| star nFixed gate |
	star := self starIndex.
	nFixed := star = 0 ifTrue: [patterns size] ifFalse: [patterns size - 1].
	aBuilder atNode: self.
	gate := aBuilder send: #'___matchIsSequence___' to: (aBuilder var: subjLeaf) with: { }.
	^ aBuilder andValue: gate then: [
		aBuilder add: (self ___emitIRSeqFrom___: 0 star: star fixed: nFixed
			subject: subjLeaf on: aBuilder)]
%

category: 'Grail-IR Codegen'
method: MatchSequenceAst
___emitIRSeqFrom___: i star: star fixed: nFixed subject: subjLeaf on: aBuilder
	"i = 0 is the length comparison; i >= 1 is the i-th element test.  Each step
	opens an and: over the rest, which is what makes the chain short-circuit."

	| here |
	here := i = 0
		ifTrue: [
			| len |
			len := aBuilder send: #'___matchLen___' to: (aBuilder var: subjLeaf) with: { }.
			aBuilder atNode: self.
			aBuilder send: (star = 0 ifTrue: [#=] ifFalse: [#'>='])
				to: len with: { aBuilder obj: nFixed } env: 0]
		ifFalse: [self ___emitIRSeqElement___: i star: star subject: subjLeaf on: aBuilder].
	i >= patterns size ifTrue: [^ here].
	^ aBuilder andValue: here then: [
		aBuilder add: (self ___emitIRSeqFrom___: i + 1 star: star fixed: nFixed
			subject: subjLeaf on: aBuilder)]
%

category: 'Grail-IR Codegen'
method: MatchSequenceAst
___emitIRSeqElement___: i star: star subject: subjLeaf on: aBuilder
	"One element of the sequence.  A ``*rest'' absorbs everything between the
	head and tail patterns and binds a LIST, never the subject's own type;
	``*_'' absorbs without binding.  Every other element is tested by applying a
	one-argument block to the item, which is how the nested pattern gets a
	subject of its own without a name."

	| p idx |
	p := patterns at: i.
	(p isKindOf: MatchStarAst) ifTrue: [
		| slice |
		p name isNil ifTrue: [aBuilder atNode: self. ^ aBuilder obj: true].
		slice := aBuilder
			send: #'___matchStarSlice___:fromEnd:' to: (aBuilder var: subjLeaf)
			with: { aBuilder obj: i - 1. aBuilder obj: patterns size - i }.
		^ aBuilder send: #value
			to: (aBuilder inBlockDo: [
				aBuilder add: (self ___emitIRMatchCaptureStore___: p name
					from: slice on: aBuilder).
				aBuilder atNode: self.
				aBuilder add: (aBuilder obj: true)])
			with: { } env: 0].
	idx := (star = 0 or: [i < star]) ifTrue: [i - 1] ifFalse: [i - patterns size - 1].
	^ aBuilder
		send: #value:
		to: (aBuilder blockWithArg: #'___msubn___' do: [:itemLeaf |
			aBuilder add: (p ___emitIRMatchTestOn___: aBuilder subject: itemLeaf)])
		with: { aBuilder send: #'___matchItemAt___:' to: (aBuilder var: subjLeaf)
			with: { aBuilder obj: idx } }
		env: 0
%

category: 'Grail-IR Codegen'
method: MatchSequenceAst
___irReadLocalNamesInto___: aSet locals: localSet
	patterns do: [:p | p ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%
