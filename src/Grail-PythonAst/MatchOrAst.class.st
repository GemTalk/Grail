"https://docs.python.org/3/library/ast.html#ast.MatchOr

``case 1 | 2 | 3:'.  Alternatives are tried left to right and the first
match wins, so later alternatives are not evaluated -- which matters,
because evaluating one can bind names.

PEP 634 requires every alternative to bind the SAME set of names; the
parser enforces that, so the emitted code does not have to.

"
Class {
	#name : 'MatchOrAst',
	#superclass : 'PatternAst',
	#instVars : [
		'patterns'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-match' }
MatchOrAst >> ___captureNodesInto___: aCollection [
	"Every alternative binds the same names (___validateBinding___:...), so the
	first one's are the or-pattern's."

	patterns first ___captureNodesInto___: aCollection

]

{ #category : 'Grail-IR Codegen' }
MatchOrAst >> ___emitIRMatchTestOn___: aBuilder subject: subjLeaf [
	"Short-circuit or:, NESTED rather than sibling, so an alternative after the
	first match never runs -- a later alternative could otherwise rebind a
	captured name."

	^ self ___emitIROrFrom___: 1 subject: subjLeaf on: aBuilder

]

{ #category : 'Grail-IR Codegen' }
MatchOrAst >> ___emitIROrFrom___: i subject: subjLeaf on: aBuilder [
	| test |
	test := (patterns at: i) ___emitIRMatchTestOn___: aBuilder subject: subjLeaf.
	i = patterns size ifTrue: [^ test].
	^ aBuilder orValue: test then: [
		aBuilder add: (self ___emitIROrFrom___: i + 1 subject: subjLeaf on: aBuilder)]

]

{ #category : 'Grail-IR Codegen' }
MatchOrAst >> ___irMatchTestEligible___: localNames [
	^ patterns allSatisfy: [:p | p ___irMatchTestEligible___: localNames]

]

{ #category : 'Grail-IR Codegen' }
MatchOrAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	patterns do: [:p | p ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self

]

{ #category : 'Grail-validation' }
MatchOrAst >> ___validateBinding___: boundNames irrefutableAllowed: aBoolean [
	"codegen_pattern_or (Python/codegen.c:6111-6256): each alternative binds
	into a list of its own, and only the last may be irrefutable, and only
	when the or-pattern itself may be.  Every alternative binds the first
	one's names, in any order -- ``alternative patterns bind different
	names'' otherwise -- and those names then join the case's, each once."

	| firstBound |
	patterns doWithIndex: [:alternative :index |
		| alternativeBound |
		alternativeBound := OrderedCollection new.
		alternative
			___validateBinding___: alternativeBound
			irrefutableAllowed: (aBoolean and: [index = patterns size]).
		firstBound isNil
			ifTrue: [firstBound := alternativeBound]
			ifFalse: [
				(alternativeBound size = firstBound size
					and: [firstBound allSatisfy: [:each | alternativeBound includes: each]]) ifFalse: [
						^ ModuleAst
							___syntaxError___: 'alternative patterns bind different names'
							node: self]]].
	firstBound do: [:each | self ___bind___: each into: boundNames at: self]

]

{ #category : 'Grail-match' }
MatchOrAst >> patterns [
	^patterns

]

{ #category : 'Grail-match' }
MatchOrAst >> patterns: newValue [
	patterns := newValue

]

{ #category : 'Grail-match' }
MatchOrAst >> printMatchTestOn: aStream subject: aName depth: anInteger [
	"Short-circuit or:, so an alternative after the first match never
	runs -- a later alternative could otherwise rebind a captured name."

	aStream nextPutAll: '('.
	1 to: patterns size do: [:i |
		i > 1 ifTrue: [aStream nextPutAll: ' or: ['].
		(patterns at: i) printMatchTestOn: aStream subject: aName depth: anInteger].
	"NESTED, not sibling: ``a or: [b] or: [c]'' is the single selector
	or:or:, which nothing implements.  Each alternative has to open a new
	block that the next one closes -- and nesting is also what makes the
	short-circuit real."
	(patterns size - 1) timesRepeat: [aStream nextPutAll: ']'].
	aStream nextPutAll: ')'

]
