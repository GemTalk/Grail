"https://docs.python.org/3/library/ast.html#ast.List

A list.

elts holds a list of nodes representing the elements.
ctx is Store if the container is an assignment target (i.e. (x,y)=something),
and Load otherwise.

Example:
>>> print(ast.dump(ast.parse('[1, 2, 3]', mode='eval'), indent=4))
Expression(
    body=List(
        elts=[Constant(value=1), Constant(value=2), Constant(value=3)],
        ctx=Load()))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        ListAst(elts ctx)

"
Class {
	#name : 'ListAst',
	#superclass : 'ExpressionAst',
	#instVars : [
		'elts',
		'ctx'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-annotations' }
ListAst >> ___defaultSourceString___ [
	"``h=[1]'' fell to the ``<annotation>'' placeholder."

	| parts |
	parts := elts collect: [:e | e ___defaultSourceString___].
	^ '[' , (parts inject: '' into: [:acc :each |
		acc isEmpty ifTrue: [each] ifFalse: [acc , ', ' , each]]) , ']'

]

{ #category : 'Grail-IR Codegen' }
ListAst >> ___emitIRValueOn___: aBuilder [
	"``[a, b]'' -> ``({a. b} perform: #asOrderedCollection env: 0)'' -- an env-0
	asOrderedCollection send on the array builder; ``[]'' ->
	``(OrderedCollection perform: #new env: 0)''.  Same shapes as
	printSmalltalkOn:'s non-splat branches (the perform:env: is just how text
	forces env 0; IR sets the send env directly)."

	| eltsArray |
	elts isEmpty ifTrue: [
		aBuilder atNode: self.
		^ aBuilder send: #new
			to: (aBuilder globalNamed: #OrderedCollection) with: { } env: 0].
	"The brace literal, or with a ``*b'' element the splat concatenation."
	eltsArray := self ___emitIRElementsArrayOn___: aBuilder elts: elts.
	aBuilder atNode: self.
	^ aBuilder send: #asOrderedCollection to: eltsArray with: { } env: 0

]

{ #category : 'Grail-other' }
ListAst >> ___emitSmalltalkOn___: aStream [

	| hasStar |
	elts isEmpty ifTrue: [
		aStream nextPutAll: '(OrderedCollection perform: #new env: 0)'.
		^self.
	].
	hasStar := elts anySatisfy: [:each | each isKindOf: StarredAst].
	hasStar ifFalse: [
		"Chunked when it is too big for one brace array (#1423)."
		aStream nextPut: $(.
		self ___printElementsArrayOf___: elts on: aStream.
		aStream nextPutAll: ' perform: #asOrderedCollection env: 0)'.
		^ self.
	].
	"Splat path: ``[a, *b, c]'' → concatenate run-arrays around each
	starred expression's asArray.  Same shape as
	CallAst>>printArgumentsArrayOn: — keeps the empty-seed Array so
	the result is always parenthesised."
	aStream nextPutAll: '(({}'.
	elts do: [:each |
		aStream nextPutAll: ' @env0:, '.
		(each isKindOf: StarredAst)
			ifTrue: [
				aStream nextPut: $(.
				each value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ' @env0:___pyStarToArray___)'.
			] ifFalse: [
				aStream nextPutAll: '{ '.
				each printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: '. }'.
			].
	].
	aStream nextPutAll: ') perform: #asOrderedCollection env: 0)'.

]

{ #category : 'Grail-IR Codegen' }
ListAst >> ___irEligibleValueLocals___: localNames [
	"A LOAD-context list display with all-eligible elements; a ``*b'' element
	(splat concat, cut 56) is eligible when its operand is.  Store-context
	targets stay on text."

	(ctx isKindOf: LoadAst) ifFalse: [^ false].
	^ elts allSatisfy: [:e | e ___irEligibleValueLocals___: localNames]

]

{ #category : 'Grail-IR Codegen' }
ListAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	elts do: [:e | e ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self

]

{ #category : 'Grail-IR Codegen' }
ListAst >> ctx [
	^ctx

]

{ #category : 'Grail-IR Codegen' }
ListAst >> ctx: newValue [
	ctx := newValue

]

{ #category : 'Grail-accessing' }
ListAst >> elts [
	^elts

]

{ #category : 'Grail-IR Codegen' }
ListAst >> elts: newValue [
	elts := newValue

]

{ #category : 'Grail-traceback' }
ListAst >> printSmalltalkOn: aStream [
	"Recorded, then emitted -- see AbstractNode >> ___recordingPrintSmalltalkOn___:."

	^ self ___recordingPrintSmalltalkOn___: aStream

]
