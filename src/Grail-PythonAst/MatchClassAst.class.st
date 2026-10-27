"https://docs.python.org/3/library/ast.html#ast.MatchClass

``case Point(0, y=1):'.

An isinstance test first, then POSITIONAL sub-patterns resolved through
the class's ``__match_args__' tuple, then keyword sub-patterns read as
plain attributes.  A class with no ``__match_args__' accepts no
positional patterns -- that is a TypeError in CPython, raised at match
time rather than a silent non-match, and ___matchArgAt___:of: keeps it
that way.

The builtins that PEP 634 gives a single ``self' match arg (int, str,
list, dict, ...) are handled by the same helper, so ``case int(x):'
binds x to the subject itself.

"
Class {
	#name : 'MatchClassAst',
	#superclass : 'PatternAst',
	#instVars : [
		'cls',
		'patterns',
		'kwdAttrs',
		'kwdPatterns'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
MatchClassAst >> ___emitIRClassFrom___: i subject: subjLeaf on: aBuilder [
	"Sub-pattern i, counting the positional ones first and then the keyword
	ones; answers true once both lists are exhausted.  A miss is the
	``___matchMiss___'' sentinel, which the inner block tests before running the
	sub-pattern -- an absent attribute is a non-match, not an error."

	| total fetch here |
	total := patterns size + kwdAttrs size.
	fetch := i <= patterns size
		ifTrue: [aBuilder
			send: #'___matchArgAt___:of:' to: (aBuilder var: subjLeaf)
			with: { aBuilder obj: i - 1. cls ___emitIRValueOn___: aBuilder }]
		ifFalse: [aBuilder
			send: #'___matchAttr___:' to: (aBuilder var: subjLeaf)
			with: { aBuilder obj: (kwdAttrs at: i - patterns size) asString }].
	here := aBuilder
		send: #value:
		to: (aBuilder blockWithArg: #'___msubn___' do: [:itemLeaf |
			| notMiss inner |
			notMiss := aBuilder send: #'~~' to: (aBuilder var: itemLeaf)
				with: { aBuilder obj: #'___matchMiss___' } env: 0.
			inner := i <= patterns size
				ifTrue: [patterns at: i]
				ifFalse: [kwdPatterns at: i - patterns size].
			aBuilder add: (aBuilder andValue: notMiss then: [
				aBuilder add: (inner ___emitIRMatchTestOn___: aBuilder subject: itemLeaf)])])
		with: { fetch }
		env: 0.
	i = total ifTrue: [^ here].
	^ aBuilder andValue: here then: [
		aBuilder add: (self ___emitIRClassFrom___: i + 1 subject: subjLeaf on: aBuilder)]

]

{ #category : 'Grail-IR Codegen' }
MatchClassAst >> ___emitIRMatchTestOn___: aBuilder subject: subjLeaf [
	"isinstance gate, then positional arguments through __match_args__, then
	keyword arguments as attributes.  Every step sits inside an and: so a failed
	isinstance never reaches an attribute read that would raise."

	| gate |
	gate := aBuilder
		send: #'___matchIsInstanceOf___:' to: (aBuilder var: subjLeaf)
		with: { cls ___emitIRValueOn___: aBuilder }.
	aBuilder atNode: self.
	"``case str():'' is the gate alone -- there is no and: to open, which is the
	same shape the text emits for a class pattern with no sub-patterns."
	(patterns size + kwdAttrs size) = 0 ifTrue: [^ gate].
	^ aBuilder andValue: gate then: [
		| accepts |
		accepts := aBuilder
			send: #'___matchClassAccepts___:keywords:of:' to: (aBuilder var: subjLeaf)
			with: { aBuilder obj: patterns size.
				aBuilder arrayOf: (kwdAttrs collect: [:each | aBuilder obj: each asString]).
				cls ___emitIRValueOn___: aBuilder }.
		aBuilder add: (aBuilder andValue: accepts then: [
			aBuilder add: (self ___emitIRClassFrom___: 1 subject: subjLeaf on: aBuilder)])]

]

{ #category : 'Grail-IR Codegen' }
MatchClassAst >> ___irMatchTestEligible___: localNames [
	(cls ___irEligibleValueLocals___: localNames) ifFalse: [^ false].
	(patterns allSatisfy: [:p | p ___irMatchTestEligible___: localNames]) ifFalse: [^ false].
	^ kwdPatterns allSatisfy: [:p | p ___irMatchTestEligible___: localNames]

]

{ #category : 'Grail-IR Codegen' }
MatchClassAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	cls ___irReadLocalNamesInto___: aSet locals: localSet.
	patterns do: [:p | p ___irReadLocalNamesInto___: aSet locals: localSet].
	kwdPatterns do: [:p | p ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self

]

{ #category : 'Grail-validation' }
MatchClassAst >> ___validateBinding___: boundNames irrefutableAllowed: aBoolean [
	"codegen_pattern_class (Python/codegen.c:5920-5975): no keyword names one
	attribute twice -- the first attribute with a later repeat, located at
	the repeat's pattern, as validate_kwd_attrs (5900-5918) finds it -- and
	every sub-pattern, positional then keyword, may be irrefutable."

	1 to: kwdAttrs size do: [:index |
		index + 1 to: kwdAttrs size do: [:laterIndex |
			(kwdAttrs at: index) = (kwdAttrs at: laterIndex) ifTrue: [
				^ ModuleAst
					___syntaxError___: 'attribute name repeated in class pattern: '
						, (kwdAttrs at: index) asString
					node: (kwdPatterns at: laterIndex)]]].
	patterns , kwdPatterns do: [:each |
		each ___validateBinding___: boundNames irrefutableAllowed: true]

]

{ #category : 'Grail-match' }
MatchClassAst >> cls [
	^cls

]

{ #category : 'Grail-match' }
MatchClassAst >> cls: newValue [
	cls := newValue

]

{ #category : 'Grail-match' }
MatchClassAst >> kwdAttrs [
	^kwdAttrs

]

{ #category : 'Grail-match' }
MatchClassAst >> kwdAttrs: newValue [
	kwdAttrs := newValue

]

{ #category : 'Grail-match' }
MatchClassAst >> kwdPatterns [
	^kwdPatterns

]

{ #category : 'Grail-match' }
MatchClassAst >> kwdPatterns: newValue [
	kwdPatterns := newValue

]

{ #category : 'Grail-match' }
MatchClassAst >> patterns [
	^patterns

]

{ #category : 'Grail-match' }
MatchClassAst >> patterns: newValue [
	patterns := newValue

]

{ #category : 'Grail-match' }
MatchClassAst >> printMatchTestOn: aStream subject: aName depth: anInteger [
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
	"CPython's match_class TypeErrors, once the isinstance test has passed
	and before any attribute is read (Object >> ___matchClassAccepts___:keywords:of:)."
	(patterns size + kwdAttrs size) > 0 ifTrue: [
		aStream nextPutAll: ' and: [(', aName, ' ___matchClassAccepts___: ', patterns size printString,
			' keywords: #('.
		kwdAttrs do: [:each | aStream nextPutAll: ''''; nextPutAll: each asString; nextPutAll: ''''] separatedBy: [aStream space].
		aStream nextPutAll: ') of: '.
		cls printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ')'].
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
	(patterns size + kwdAttrs size) > 0 ifTrue: [aStream nextPutAll: ']'].
	aStream nextPutAll: ')'

]
