"https://docs.python.org/3/library/ast.html#ast.MatchSingleton

``case None:', ``case True:', ``case False:'.  PEP 634 requires these
three to be compared by IDENTITY, not ``==' -- ``case True:' must not
match the integer 1, though ``1 == True' is true in Python.

"
Class {
	#name : 'MatchSingletonAst',
	#superclass : 'PatternAst',
	#instVars : [
		'value'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
MatchSingletonAst >> ___emitIRMatchTestOn___: aBuilder subject: subjLeaf [
	"Identity, deliberately: PEP 634 specifies ``is'' for None/True/False, so
	``case True:'' must not match 1 -- which ``=='' would, bool being an int
	subclass."

	| v |
	v := value ___emitIRValueOn___: aBuilder.
	aBuilder atNode: self.
	^ aBuilder send: #== to: (aBuilder var: subjLeaf) with: { v } env: 0

]

{ #category : 'Grail-AST export' }
MatchSingletonAst >> ___fixUpPythonAst___: pyNode [
	"CPython keeps this pattern's value as a plain value, not as a node."

	self ___unwrapAstField___: 'value' of: pyNode.
	^ self

]

{ #category : 'Grail-IR Codegen' }
MatchSingletonAst >> ___irMatchTestEligible___: localNames [
	^ value ___irEligibleValueLocals___: localNames

]

{ #category : 'Grail-IR Codegen' }
MatchSingletonAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	value ___irReadLocalNamesInto___: aSet locals: localSet.
	^ self

]

{ #category : 'Grail-match' }
MatchSingletonAst >> printMatchTestOn: aStream subject: aName depth: anInteger [
	"Identity, deliberately: PEP 634 specifies ``is'' for None/True/False
	so that ``case True:'' does not match 1 and ``case False:'' does not
	match 0 -- which ``=='' would, since bool is an int subclass."

	aStream nextPutAll: '(', aName, ' @env0:== '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ')'

]

{ #category : 'Grail-match' }
MatchSingletonAst >> value [
	^value

]

{ #category : 'Grail-match' }
MatchSingletonAst >> value: newValue [
	value := newValue

]
