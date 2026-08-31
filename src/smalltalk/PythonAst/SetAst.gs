! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for SetAst
expectvalue /Class
doit
ExpressionAst subclass: 'SetAst'
  instVarNames: #( elts)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
SetAst comment:
'https://docs.python.org/3/library/ast.html#ast.Set

A set.

elts holds a list of nodes representing the set''s elements.

Example:
>>> print(ast.dump(ast.parse(''{1, 2, 3}'', mode=''eval''), indent=4))
Expression(
    body=Set(
        elts=[Constant(value=1), Constant(value=2), Constant(value=3)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        SetAst(elts)
'
%

expectvalue /Class
doit
SetAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from SetAst
removeallmethods SetAst
removeallclassmethods SetAst

set compile_env: 0

category: 'Grail-other'
method: SetAst
printSmalltalkOn: aStream

	aStream nextPutAll: '([:___s | '.
	elts do: [:each |
		aStream nextPutAll: '___s add: '.
		"Parenthesize: an element that prints as a keyword send
		(``x @env1:___pyAttrLoad___: #'attr''') would otherwise fuse
		with ``add:'' into one selector (#add:___pyAttrLoad___:) —
		{inspect.Parameter.POSITIONAL_ONLY, ...} in django.utils.
		inspect hit exactly that."
		each printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: '. '.
	].
	aStream nextPutAll: '___s] value: (set perform: #new env: 0))'.
%
method: SetAst
elts
	^elts
%
method: SetAst
elts: newValue
	elts := newValue
%

category: 'Grail-annotations'
method: SetAst
___defaultSourceString___
	"A set default fell to the ``<annotation>'' placeholder."

	| parts |
	parts := elts collect: [:e | e ___defaultSourceString___].
	parts isEmpty ifTrue: [^ 'set()'].
	^ '{' , (parts inject: '' into: [:acc :each |
		acc isEmpty ifTrue: [each] ifFalse: [acc , ', ' , each]]) , '}'
%

category: 'Grail-IR Codegen'
method: SetAst
___irEligibleValueLocals___: localNames
	"A set display with no splat and every element emittable."

	(elts anySatisfy: [:e | e isKindOf: StarredAst]) ifTrue: [^ false].
	^ elts allSatisfy: [:e | e ___irEligibleValueLocals___: localNames]
%

category: 'Grail-IR Codegen'
method: SetAst
___emitIRValueOn___: aBuilder
	"``{a, b}'' -> ``([:___s | ___s add: (a). ___s add: (b). ___s]
	value: (set perform: #new env: 0))'' -- printSmalltalkOn:'s shape."

	| accBlk fresh |
	aBuilder at: self beginPosition.
	fresh := aBuilder
		send: #new to: (aBuilder globalNamed: #set) with: { } env: 0.
	accBlk := aBuilder blockWithArg: #'___s' do: [:sLeaf |
		elts do: [:each |
			aBuilder add: (aBuilder
				send: #add:
				to: (aBuilder var: sLeaf)
				with: { each ___emitIRValueOn___: aBuilder })].
		aBuilder add: (aBuilder var: sLeaf)].
	^ aBuilder send: #value: to: accBlk with: { fresh } env: 0
%

category: 'Grail-IR Codegen'
method: SetAst
___irReadLocalNamesInto___: aSet locals: localSet
	elts do: [:e | e ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%
