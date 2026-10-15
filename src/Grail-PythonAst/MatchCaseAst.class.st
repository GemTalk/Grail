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

	| test |
	test := pattern ___emitIRMatchTestOn___: aBuilder subject: subjLeaf.
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
	"Pattern first, then the guard -- in that order, and short-circuited,
	because the guard is allowed to reference names the pattern binds."

	guard isNil ifTrue: [
		^ pattern printMatchTestOn: aStream subject: aName depth: anInteger].
	aStream nextPutAll: '('.
	pattern printMatchTestOn: aStream subject: aName depth: anInteger.
	aStream nextPutAll: ' and: ['.
	guard printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ___isTruthy___])'

]
