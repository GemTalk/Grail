"https://docs.python.org/3/library/ast.html#ast.match_case

One ``case P if G: BODY' clause of a match statement.  The guard runs
only after the pattern matches, and therefore CAN see the names the
pattern just bound -- ``case [x, y] if x < y:' is the point of guards.

"
Class {
	#name : 'MatchCaseAst',
	#superclass : 'AbstractLocationNode',
	#instVars : [
		'pattern',
		'guard',
		'body'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
MatchCaseAst >> ___emitIRMatchTestOn___: aBuilder subject: subjLeaf [
	"``(pattern-test) and: [(guard) ___isTruthy___]'' -- the and: so a guard
	never runs for a case whose pattern failed, and so a guard sees the
	bindings the pattern just made."

	| test captured |
	test := pattern ___emitIRMatchTestOn___: aBuilder subject: subjLeaf.
	"The commit of the pending captures, as printMatchTestOn:subject:depth:
	makes it."
	captured := OrderedCollection new.
	pattern ___captureNodesInto___: captured.
	captured isEmpty ifFalse: [
		test := aBuilder andValue: test then: [
			captured do: [:each |
				aBuilder add: (self ___emitIRMatchCaptureStore___: each
					from: (aBuilder var: (pattern ___irPendingCaptureLeafFor___: each on: aBuilder))
					on: aBuilder)].
			aBuilder atNode: self.
			aBuilder add: (aBuilder obj: true)]].
	guard isNil ifTrue: [^ test].
	^ aBuilder andValue: test then: [
		aBuilder add: (aBuilder
			send: #'___isTruthy___'
			to: (guard ___emitIRValueOn___: aBuilder)
			with: { })]

]

{ #category : 'Grail-IR Codegen' }
MatchCaseAst >> ___irMatchCaseEligible___: localNames [
	^ (pattern ___irMatchTestEligible___: localNames)
		and: [(guard isNil or: [guard ___irEligibleValueLocals___: localNames])
		and: [body ___irEligibleStatementsWithLocals___: localNames]]

]

{ #category : 'Grail-IR Codegen' }
MatchCaseAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	pattern ___irReadLocalNamesInto___: aSet locals: localSet.
	guard ifNotNil: [:g | g ___irReadLocalNamesInto___: aSet locals: localSet].
	body ___irReadLocalNamesInto___: aSet locals: localSet.
	^ self

]

{ #category : 'Grail-match' }
MatchCaseAst >> body [
	^body

]

{ #category : 'Grail-match' }
MatchCaseAst >> body: newValue [
	body := newValue

]

{ #category : 'Grail-match' }
MatchCaseAst >> guard [
	^guard

]

{ #category : 'Grail-match' }
MatchCaseAst >> guard: newValue [
	guard := newValue

]

{ #category : 'Grail-match' }
MatchCaseAst >> pattern [
	^pattern

]

{ #category : 'Grail-match' }
MatchCaseAst >> pattern: newValue [
	pattern := newValue

]

{ #category : 'Grail-match' }
MatchCaseAst >> printMatchTestOn: aStream subject: aName depth: anInteger [
	"Pattern first, then the commit of what it captured, then the guard -- in
	that order, and short-circuited.  The captures wait in pending temps
	until the whole pattern has matched (MatchAst >>
	___pendingCaptureTempFor___:), and are bound before the guard runs,
	because the guard may reference them and they stay bound if it fails, as
	in CPython (Python/codegen.c:6405-6419)."

	| captured |
	captured := OrderedCollection new.
	pattern ___captureNodesInto___: captured.
	(guard isNil and: [captured isEmpty]) ifTrue: [
		^ pattern printMatchTestOn: aStream subject: aName depth: anInteger].
	aStream nextPutAll: '('.
	captured isEmpty ifFalse: [aStream nextPutAll: '('].
	pattern printMatchTestOn: aStream subject: aName depth: anInteger.
	captured isEmpty ifFalse: [
		aStream nextPutAll: ' and: ['.
		captured do: [:each |
			self emitNameStoreOn: aStream target: each rhs: (pattern ___pendingCaptureTempFor___: each).
			aStream nextPutAll: '. '].
		aStream nextPutAll: 'true])'].
	guard isNil ifFalse: [
		aStream nextPutAll: ' and: ['.
		guard printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ' ___isTruthy___]'].
	aStream nextPutAll: ')'

]
