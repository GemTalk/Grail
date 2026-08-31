! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ListAst
expectvalue /Class
doit
ExpressionAst subclass: 'ListAst'
  instVarNames: #( elts ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ListAst comment:
'https://docs.python.org/3/library/ast.html#ast.List

A list.

elts holds a list of nodes representing the elements.
ctx is Store if the container is an assignment target (i.e. (x,y)=something),
and Load otherwise.

Example:
>>> print(ast.dump(ast.parse(''[1, 2, 3]'', mode=''eval''), indent=4))
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
'
%

expectvalue /Class
doit
ListAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ListAst
removeallmethods ListAst
removeallclassmethods ListAst

set compile_env: 0

category: 'Grail-accessing'
method: ListAst
elts
	^elts
%

category: 'Grail-other'
method: ListAst
printSmalltalkOn: aStream

	| hasStar |
	elts isEmpty ifTrue: [
		aStream nextPutAll: '(OrderedCollection perform: #new env: 0)'.
		^self.
	].
	hasStar := elts anySatisfy: [:each | each isKindOf: StarredAst].
	hasStar ifFalse: [
		aStream nextPutAll: '({'.
		elts doWithIndex: [:each :i |
			i > 1 ifTrue: [aStream nextPutAll: '. '].
			each printSmalltalkOn: aStream.
		].
		aStream nextPutAll: '} perform: #asOrderedCollection env: 0)'.
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
%
category: 'Grail-IR Codegen'
method: ListAst
___irEligibleValueLocals___: localNames
	"A LOAD-context list display with no splat and all-eligible elements.
	``[a, *b]'' (splat concat) and store-context targets stay on text."

	((ctx isKindOf: LoadAst)
		and: [(elts anySatisfy: [:e | e isKindOf: StarredAst]) not]) ifFalse: [^ false].
	^ elts allSatisfy: [:e | e ___irEligibleValueLocals___: localNames]
%

category: 'Grail-IR Codegen'
method: ListAst
___emitIRValueOn___: aBuilder
	"``[a, b]'' -> ``({a. b} perform: #asOrderedCollection env: 0)'' -- an env-0
	asOrderedCollection send on the array builder; ``[]'' ->
	``(OrderedCollection perform: #new env: 0)''.  Same shapes as
	printSmalltalkOn:'s non-splat branches (the perform:env: is just how text
	forces env 0; IR sets the send env directly)."

	| eltNodes |
	elts isEmpty ifTrue: [
		aBuilder at: self beginPosition.
		^ aBuilder send: #new
			to: (aBuilder globalNamed: #OrderedCollection) with: { } env: 0].
	eltNodes := elts collect: [:e | e ___emitIRValueOn___: aBuilder].
	aBuilder at: self beginPosition.
	^ aBuilder send: #asOrderedCollection
		to: (aBuilder arrayOf: eltNodes) with: { } env: 0
%

category: 'Grail-IR Codegen'
method: ListAst
___irReadLocalNamesInto___: aSet locals: localSet
	elts do: [:e | e ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%

method: ListAst
elts: newValue
	elts := newValue
%
method: ListAst
ctx
	^ctx
%
method: ListAst
ctx: newValue
	ctx := newValue
%

category: 'Grail-annotations'
method: ListAst
___defaultSourceString___
	"``h=[1]'' fell to the ``<annotation>'' placeholder."

	| parts |
	parts := elts collect: [:e | e ___defaultSourceString___].
	^ '[' , (parts inject: '' into: [:acc :each |
		acc isEmpty ifTrue: [each] ifFalse: [acc , ', ' , each]]) , ']'
%
