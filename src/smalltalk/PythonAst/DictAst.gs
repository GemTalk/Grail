! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for DictAst
expectvalue /Class
doit
ExpressionAst subclass: 'DictAst'
  instVarNames: #( keys values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
DictAst comment:
'https://docs.python.org/3/library/ast.html#ast.Dict

A dictionary.

keys and values hold lists of nodes representing the keys and the values respectively,
in matching order (what would be returned when calling dictionary.keys() and dictionary.values()).

When doing dictionary unpacking using dictionary literals the expression to be expanded
goes in the values list, with a None at the corresponding position in keys.

Example:
>>> print(ast.dump(ast.parse(''{"a":1, **d}'', mode=''eval''), indent=4))
Expression(
    body=Dict(
        keys=[Constant(value=''a''), None],
        values=[Constant(value=1), Name(id=''d'', ctx=Load())]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        DictAst(keys values)
'
%

expectvalue /Class
doit
DictAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from DictAst
removeallmethods DictAst
removeallclassmethods DictAst

set compile_env: 0

category: 'Grail-other'
method: DictAst
printSmalltalkOn: aStream

	keys isEmpty ifTrue: [
		aStream nextPutAll: '(PyDict perform: #new env: 0)'.
		^self.
	].
	aStream nextPutAll: '([:___d | '.
	1 to: keys size do: [:i |
		(keys at: i) isNil
			ifTrue: [
				"Dictionary unpacking ``{**expr}``: the parser puts the
				mapping in `values` with a None (nil) at the matching
				`keys` position.  Merge the mapping's items into the
				accumulator (later keys overwrite earlier ones, matching
				CPython's left-to-right literal evaluation)."
				aStream nextPutAll: '___d update: '.
				(values at: i) printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: '. '.
			]
			ifFalse: [
				"Wrap both key and value in parens so keyword-form
				expressions (e.g. AttributeAst's ``obj @env1:___pyAttrLoad___:
				#x``) don't merge with the surrounding ``__setitem__:_:``
				selector."
				aStream nextPutAll: '___d __setitem__: '.
				(keys at: i) printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ' _: '.
				(values at: i) printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: '. '.
			].
	].
	aStream nextPutAll: '___d] value: (PyDict perform: #new env: 0))'.
%
method: DictAst
keys
	^keys
%
method: DictAst
keys: newValue
	keys := newValue
%
method: DictAst
values
	^values
%
method: DictAst
values: newValue
	values := newValue
%

category: 'Grail-annotations'
method: DictAst
___defaultSourceString___
	"``i={'x': 1}'' fell to the ``<annotation>'' placeholder."

	| parts |
	parts := OrderedCollection new.
	1 to: keys size do: [:i |
		parts add: ((keys at: i) ___defaultSourceString___) , ': '
			, ((values at: i) ___defaultSourceString___)].
	^ '{' , (parts inject: '' into: [:acc :each |
		acc isEmpty ifTrue: [each] ifFalse: [acc , ', ' , each]]) , '}'
%

category: 'Grail-IR Codegen'
method: DictAst
___irEligibleValueLocals___: localNames
	"A dict display with explicit key: value pairs only -- ``{**m}'' unpacking
	(a nil key) stays on text -- and every key / value emittable."

	1 to: keys size do: [:i |
		(keys at: i) isNil ifTrue: [^ false].
		((keys at: i) ___irEligibleValueLocals___: localNames) ifFalse: [^ false].
		((values at: i) ___irEligibleValueLocals___: localNames) ifFalse: [^ false]].
	^ true
%

category: 'Grail-IR Codegen'
method: DictAst
___emitIRValueOn___: aBuilder
	"``{}'' -> ``(PyDict perform: #new env: 0)''; ``{k: v, ...}'' ->
	``([:___d | ___d __setitem__: (k) _: (v). ... ___d] value: (PyDict new))''
	-- printSmalltalkOn:'s accumulator-block shape (pairs stored left to right,
	later keys overwriting earlier ones)."

	| accBlk fresh |
	aBuilder at: self beginPosition.
	fresh := aBuilder
		send: #new to: (aBuilder globalNamed: #PyDict) with: { } env: 0.
	keys isEmpty ifTrue: [^ fresh].
	accBlk := aBuilder blockWithArg: #'___d' do: [:dLeaf |
		1 to: keys size do: [:i |
			| k v |
			k := (keys at: i) ___emitIRValueOn___: aBuilder.
			v := (values at: i) ___emitIRValueOn___: aBuilder.
			aBuilder add: (aBuilder
				send: #'__setitem__:_:' to: (aBuilder var: dLeaf) with: { k. v })].
		aBuilder add: (aBuilder var: dLeaf)].
	^ aBuilder send: #value: to: accBlk with: { fresh } env: 0
%

category: 'Grail-IR Codegen'
method: DictAst
___irReadLocalNamesInto___: aSet locals: localSet
	keys do: [:k | k ifNotNil: [k ___irReadLocalNamesInto___: aSet locals: localSet]].
	values do: [:v | v ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%
