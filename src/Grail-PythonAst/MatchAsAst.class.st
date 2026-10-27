"https://docs.python.org/3/library/ast.html#ast.MatchAs

Three shapes share this node, as they do in CPython's AST:

  case _:          pattern nil, name nil   -- wildcard, always matches
  case x:          pattern nil, name 'x' -- capture, always matches
  case P as x:     pattern P,   name 'x' -- match P, then bind

The binding happens only AFTER the inner pattern succeeds, which is what
makes ``case [1, y] as whole:' bind ``whole' only for a real match.

"
Class {
	#name : 'MatchAsAst',
	#superclass : 'PatternAst',
	#instVars : [
		'pattern',
		'name'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-match' }
MatchAsAst >> ___captureNodesInto___: aCollection [
	pattern ifNotNil: [:inner | inner ___captureNodesInto___: aCollection].
	self ___addCapture___: name into: aCollection

]

{ #category : 'Grail-IR Codegen' }
MatchAsAst >> ___emitIRBindTrueOn___: aBuilder subject: subjLeaf [
	"``<store>. true'' as two statements of whatever block encloses them."

	aBuilder add: (self ___emitIRPendingCapture___: name
		from: (aBuilder var: subjLeaf) on: aBuilder).
	aBuilder atNode: self.
	^ aBuilder add: (aBuilder obj: true)

]

{ #category : 'Grail-IR Codegen' }
MatchAsAst >> ___emitIRMatchTestOn___: aBuilder subject: subjLeaf [
	"A wildcard answers true; a bare capture binds and answers true; ``P as x''
	guards the bind behind P's own test with and:, so the bind does not happen
	when P fails.

	The text needs a BLOCK to sequence the bind and the true, because Smalltalk
	parentheses group one expression.  Here the block is
	``inBlockDo:'' + #value for the same reason: the IR statement list inside a
	block is what makes ``bind, then answer true'' one value node."

	pattern isNil ifTrue: [
		name isNil ifTrue: [aBuilder atNode: self. ^ aBuilder obj: true].
		^ aBuilder send: #value
			to: (aBuilder inBlockDo: [self ___emitIRBindTrueOn___: aBuilder subject: subjLeaf])
			with: { } env: 0].
	name isNil ifTrue: [^ pattern ___emitIRMatchTestOn___: aBuilder subject: subjLeaf].
	^ aBuilder
		andValue: (pattern ___emitIRMatchTestOn___: aBuilder subject: subjLeaf)
		then: [self ___emitIRBindTrueOn___: aBuilder subject: subjLeaf]

]

{ #category : 'Grail-AST export' }
MatchAsAst >> ___fixUpPythonAst___: pyNode [
	"CPython keeps this pattern's name as a plain str, not as a node."

	self ___unwrapAstField___: 'name' of: pyNode.
	^ self

]

{ #category : 'Grail-IR Codegen' }
MatchAsAst >> ___irMatchTestEligible___: localNames [
	(self ___irMatchCaptureEligible___: name locals: localNames) ifFalse: [^ false].
	^ pattern isNil or: [pattern ___irMatchTestEligible___: localNames]

]

{ #category : 'Grail-IR Codegen' }
MatchAsAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	pattern ifNotNil: [:p | p ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self

]

{ #category : 'Grail-validation' }
MatchAsAst >> ___validateBinding___: boundNames irrefutableAllowed: aBoolean [
	"codegen_pattern_as (Python/codegen.c:5862-5885): a bare capture or
	wildcard matches anything, so it may stand only where nothing is left to
	try after it; ``P as x'' checks P under the same rule, then binds x."

	pattern isNil
		ifTrue: [
			aBoolean ifFalse: [
				name isNil ifTrue: [
					^ ModuleAst
						___syntaxError___: 'wildcard makes remaining patterns unreachable'
						node: self].
				^ ModuleAst
					___syntaxError___: 'name capture ''' , name id asString
						, ''' makes remaining patterns unreachable'
					node: self]]
		ifFalse: [pattern ___validateBinding___: boundNames irrefutableAllowed: aBoolean].
	name ifNotNil: [:target | self ___bind___: target id into: boundNames at: self]

]

{ #category : 'Grail-match' }
MatchAsAst >> name [
	^name

]

{ #category : 'Grail-match' }
MatchAsAst >> name: newValue [
	name := newValue

]

{ #category : 'Grail-match' }
MatchAsAst >> pattern [
	^pattern

]

{ #category : 'Grail-match' }
MatchAsAst >> pattern: newValue [
	pattern := newValue

]

{ #category : 'Grail-match' }
MatchAsAst >> printMatchTestOn: aStream subject: aName depth: anInteger [
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
			self printPendingCaptureOn: aStream target: name rhs: aName.
			^ aStream nextPutAll: '. true] @env0:value'].
	aStream nextPutAll: '('.
	pattern printMatchTestOn: aStream subject: aName depth: anInteger.
	name isNil ifTrue: [^ aStream nextPutAll: ')'].
	aStream nextPutAll: ' and: ['.
	self printPendingCaptureOn: aStream target: name rhs: aName.
	aStream nextPutAll: '. true])'

]
