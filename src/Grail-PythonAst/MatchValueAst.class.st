"https://docs.python.org/3/library/ast.html#ast.MatchValue

A literal or dotted-name pattern -- ``case 1:', ``case 'a':',
``case Color.RED:'.  Compared with ``==', not identity, exactly as
CPython does.

Bare names are NOT value patterns: ``case x:' captures.  Only a DOTTED
name (``a.b') is a value pattern, which is why the parser turns a bare
NAME into a MatchAsAst instead.

"
Class {
	#name : 'MatchValueAst',
	#superclass : 'PatternAst',
	#instVars : [
		'value'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
MatchValueAst >> ___emitIRMatchTestOn___: aBuilder subject: subjLeaf [
	"``(subject ___cmpEq___: value) ___isTruthy___'' -- through the rich-compare
	helper, not __eq__:, so the NotImplemented sentinel cannot make every
	unorderable comparison match (see printMatchTestOn:)."

	| cmp |
	cmp := aBuilder
		send: #'___cmpEq___:' to: (aBuilder var: subjLeaf)
		with: { value ___emitIRValueOn___: aBuilder }.
	aBuilder atNode: self.
	^ aBuilder send: #'___isTruthy___' to: cmp with: { }

]

{ #category : 'Grail-IR Codegen' }
MatchValueAst >> ___irMatchTestEligible___: localNames [
	^ value ___irEligibleValueLocals___: localNames

]

{ #category : 'Grail-IR Codegen' }
MatchValueAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	value ___irReadLocalNamesInto___: aSet locals: localSet.
	^ self

]

{ #category : 'Grail-match' }
MatchValueAst >> printMatchTestOn: aStream subject: aName depth: anInteger [
	"``==''-comparison against the pattern's value.  Routed through
	___cmpEq___: rather than __eq__: so the full rich-compare protocol
	runs (reflected operand, NotImplemented fallback to identity) and the
	answer is a real Python bool -- __eq__: can answer the NotImplemented
	SENTINEL, whose ___isTruthy___ is simply true, which would make every
	unorderable comparison match."

	aStream nextPutAll: '(', aName, ' ___cmpEq___: '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ') ___isTruthy___'

]

{ #category : 'Grail-match' }
MatchValueAst >> value [
	^value

]

{ #category : 'Grail-match' }
MatchValueAst >> value: newValue [
	value := newValue

]
