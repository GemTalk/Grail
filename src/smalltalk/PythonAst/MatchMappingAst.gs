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

category: 'Grail-IR Codegen'
method: MatchMappingAst
___irMatchTestEligible___: localNames
	(keys allSatisfy: [:k | k ___irEligibleValueLocals___: localNames]) ifFalse: [^ false].
	(patterns allSatisfy: [:p | p ___irMatchTestEligible___: localNames]) ifFalse: [^ false].
	^ self ___irMatchCaptureEligible___: rest locals: localNames
%

category: 'Grail-IR Codegen'
method: MatchMappingAst
___emitIRMatchTestOn___: aBuilder subject: subjLeaf
	"Every named key must be PRESENT and its value must match; unnamed keys in
	the subject are ignored, a mapping pattern being a subset test.  Presence is
	checked before the value is fetched, so a missing key is a non-match rather
	than a KeyError."

	| gate |
	aBuilder atNode: self.
	gate := aBuilder send: #'___matchIsMapping___' to: (aBuilder var: subjLeaf) with: { }.
	^ aBuilder andValue: gate then: [
		aBuilder add: (self ___emitIRMapFrom___: 1 subject: subjLeaf on: aBuilder)]
%

category: 'Grail-IR Codegen'
method: MatchMappingAst
___emitIRMapFrom___: i subject: subjLeaf on: aBuilder
	"Key i's presence test, then its value test, then the rest of the keys --
	and the ``**rest'' binding last, after every key has matched."

	| has |
	i > keys size ifTrue: [^ self ___emitIRMapRestOn___: aBuilder subject: subjLeaf].
	has := aBuilder
		send: #'___matchHasKey___:' to: (aBuilder var: subjLeaf)
		with: { (keys at: i) ___emitIRValueOn___: aBuilder }.
	^ aBuilder andValue: has then: [
		| valueTest |
		valueTest := aBuilder
			send: #value:
			to: (aBuilder blockWithArg: #'___msubn___' do: [:itemLeaf |
				aBuilder add: ((patterns at: i)
					___emitIRMatchTestOn___: aBuilder subject: itemLeaf)])
			with: { aBuilder
				send: #'___matchItemForKey___:' to: (aBuilder var: subjLeaf)
				with: { (keys at: i) ___emitIRValueOn___: aBuilder } }
			env: 0.
		aBuilder add: (aBuilder andValue: valueTest then: [
			aBuilder add: (self ___emitIRMapFrom___: i + 1 subject: subjLeaf on: aBuilder)])]
%

category: 'Grail-IR Codegen'
method: MatchMappingAst
___emitIRMapRestOn___: aBuilder subject: subjLeaf
	"``**rest'' binds a new mapping of everything the named keys did not claim,
	and answers true; with no rest clause there is nothing left to test."

	| excl |
	rest isNil ifTrue: [aBuilder atNode: self. ^ aBuilder obj: true].
	excl := aBuilder arrayOf: (keys collect: [:k | k ___emitIRValueOn___: aBuilder]).
	^ aBuilder send: #value
		to: (aBuilder inBlockDo: [
			aBuilder add: (self ___emitIRMatchCaptureStore___: rest
				from: (aBuilder
					send: #'___matchRestExcluding___:' to: (aBuilder var: subjLeaf)
					with: { excl })
				on: aBuilder).
			aBuilder atNode: self.
			aBuilder add: (aBuilder obj: true)])
		with: { } env: 0
%

category: 'Grail-IR Codegen'
method: MatchMappingAst
___irReadLocalNamesInto___: aSet locals: localSet
	keys do: [:k | k ___irReadLocalNamesInto___: aSet locals: localSet].
	patterns do: [:p | p ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%
