! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for DictCompAst
expectvalue /Class
doit
ExpressionAst subclass: 'DictCompAst'
  instVarNames: #( key value generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
DictCompAst comment:
'https://docs.python.org/3/library/ast.html#ast.DictComp

A dictionary comprehension.

key and value are single nodes representing the parts that will be evaluated for each item.
generators is a list of comprehension nodes.

Example:
>>> print(ast.dump(ast.parse(''{x: x**2 for x in numbers}'', mode=''eval''), indent=4))
Expression(
    body=DictComp(
        key=Name(id=''x'', ctx=Load()),
        value=BinOp(left=Name(id=''x'', ctx=Load()), op=Pow(), right=Constant(value=2)),
        generators=[comprehension(...)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        DictCompAst(key value generators)
'
%

expectvalue /Class
doit
DictCompAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from DictCompAst
removeallmethods DictCompAst
removeallclassmethods DictCompAst
set compile_env: 0
! ------------------- Class methods for DictCompAst
! ------------------- Instance methods for DictCompAst

category: 'code generation'
method: DictCompAst
printSmalltalkOn: aStream
	"{k: v for t in iter [if c]* ...} -> a KeyValueDictionary. Wraps the
	generators around an inner body that stores k -> v in the accumulator."

	aStream nextPutAll: '([| ___r___ |'; lf; increaseIndent.
	aStream nextPutAll: '___r___ := (PyDict perform: #new env: 0).'; lf.
	ComprehensionAst
		emitGenerators: generators
		from: 1
		on: aStream
		innerBody: [
			aStream nextPutAll: '___r___ @env0:at: ('.
			key printSmalltalkOn: aStream.
			aStream nextPutAll: ') @env0:put: ('.
			value printSmalltalkOn: aStream.
			aStream nextPutAll: ').'; lf.
		].
	aStream nextPutAll: '___r___'; lf.
	aStream decreaseIndent; nextPutAll: '] value)'
%
method: DictCompAst
key
	^key
%
method: DictCompAst
key: newValue
	key := newValue
%
method: DictCompAst
value
	^value
%
method: DictCompAst
value: newValue
	value := newValue
%
method: DictCompAst
generators
	^generators
%
method: DictCompAst
generators: newValue
	generators := newValue
%

category: 'Grail-IR Codegen'
method: DictCompAst
___irEligibleValueLocals___: localNames
	"ListCompAst's rule (cut 58) with two element parts: the key and the value
	are both judged in the comprehension's scope."

	| inner |
	(ComprehensionAst ___irRefusal___: generators) notNil ifTrue: [^ false].
	(ComprehensionAst ___irClausesEligible___: generators locals: localNames) ifFalse: [^ false].
	inner := ComprehensionAst ___irScopeLocals___: localNames generators: generators.
	^ (key ___irEligibleValueLocals___: inner)
		and: [value ___irEligibleValueLocals___: inner]
%

category: 'Grail-IR Codegen'
method: DictCompAst
___irChildLocals___: localSet
	^ ComprehensionAst ___irScopeLocals___: localSet generators: generators
%

category: 'Grail-IR Codegen'
method: DictCompAst
___irRefusalDetail___: localSet
	^ (ComprehensionAst ___irRefusal___: generators) ifNil: [#'DictCompAst:other']
%

category: 'Grail-IR Codegen'
method: DictCompAst
___irReadLocalNamesInto___: aSet locals: localSet
	ComprehensionAst ___irReadsOf___: generators parts: { key. value } into: aSet locals: localSet.
	^ self
%

category: 'Grail-IR Codegen'
method: DictCompAst
___emitIRValueOn___: aBuilder
	"printSmalltalkOn:'s accumulator block over ``(PyDict perform: #new env: 0)''
	with ``___r___ @env0:at: (key) @env0:put: (value)'' as the innermost
	statement -- key evaluated before value, as the text's argument order."

	| outer |
	aBuilder at: self beginPosition.
	outer := aBuilder blockWithTemps: { #'___r___' } do: [:leaves |
		| rLeaf |
		rLeaf := leaves first.
		aBuilder at: self beginPosition.
		aBuilder add: (aBuilder assign: rLeaf from: (aBuilder
			send: #new to: (aBuilder globalNamed: #PyDict) with: { } env: 0)).
		ComprehensionAst ___emitIRGenerators___: generators from: 1 on: aBuilder
			innerBody: [
				| k v |
				k := key ___emitIRValueOn___: aBuilder.
				v := value ___emitIRValueOn___: aBuilder.
				aBuilder at: key beginPosition.
				aBuilder add: (aBuilder send: #at:put: to: (aBuilder var: rLeaf) with: { k. v } env: 0)]
			outerSource: nil.
		aBuilder at: self beginPosition.
		aBuilder add: (aBuilder var: rLeaf)].
	aBuilder at: self beginPosition.
	^ aBuilder send: #value to: outer with: { } env: 0
%
