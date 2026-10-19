"https://docs.python.org/3/library/ast.html#ast.MatchStar

The ``*rest' of a sequence pattern.  Never tested on its own -- the
enclosing MatchSequenceAst handles it, because how much of the subject it
absorbs depends on how many fixed patterns sit on either side of it.
``case [*_]:' has a nil name and simply absorbs without binding.

"
Class {
	#name : 'MatchStarAst',
	#superclass : 'PatternAst',
	#instVars : [
		'name'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-AST export' }
MatchStarAst >> ___fixUpPythonAst___: pyNode [
	"CPython keeps this pattern's name as a plain str, not as a node."

	self ___unwrapAstField___: 'name' of: pyNode.
	^ self

]

{ #category : 'Grail-IR Codegen' }
MatchStarAst >> ___irMatchTestEligible___: localNames [
	"A star pattern is only valid inside a sequence pattern, which handles it
	itself; reaching the generic walk is the parser's error, not a refusal."

	^ self ___irMatchCaptureEligible___: name locals: localNames

]

{ #category : 'Grail-IR Codegen' }
MatchStarAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	^ self

]

{ #category : 'Grail-match' }
MatchStarAst >> name [
	^name

]

{ #category : 'Grail-match' }
MatchStarAst >> name: newValue [
	name := newValue

]

{ #category : 'Grail-match' }
MatchStarAst >> printMatchTestOn: aStream subject: aName depth: anInteger [
	"A star pattern is meaningless outside a sequence pattern; the parser
	rejects that, so reaching here is an internal error, not user input."

	self error: 'a star pattern is only valid inside a sequence pattern'

]
