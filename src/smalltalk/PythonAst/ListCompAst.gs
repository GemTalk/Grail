! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ListCompAst
expectvalue /Class
doit
ExpressionAst subclass: 'ListCompAst'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ListCompAst comment:
'https://docs.python.org/3/library/ast.html#ast.ListComp

A list comprehension.

elt is a single node representing the part that will be evaluated for each item.
generators is a list of comprehension nodes.

Example:
>>> print(ast.dump(ast.parse(''[x for x in numbers]'', mode=''eval''), indent=4))
Expression(
    body=ListComp(
        elt=Name(id=''x'', ctx=Load()),
        generators=[comprehension(...)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        ListCompAst(elt generators)
'
%

expectvalue /Class
doit
ListCompAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ListCompAst
removeallmethods ListCompAst
removeallclassmethods ListCompAst
set compile_env: 0
! ------------------- Class methods for ListCompAst
! ------------------- Instance methods for ListCompAst

category: 'code generation'
method: ListCompAst
printSmalltalkOn: aStream
	"[expr for t in iter [if c]* ...] -> an OrderedCollection. Wraps the
	generators (see ComprehensionAst class>>emitGenerators:from:on:innerBody:)
	around an inner body that appends elt to a private accumulator."

	aStream nextPutAll: '([| ___r___ |'; lf; increaseIndent.
	aStream nextPutAll: '___r___ := (OrderedCollection perform: #new env: 0).'; lf.
	ComprehensionAst
		emitGenerators: generators
		from: 1
		on: aStream
		innerBody: [
			aStream nextPutAll: '___r___ @env0:add: ('.
			elt printSmalltalkOn: aStream.
			aStream nextPutAll: ').'; lf.
		].
	aStream nextPutAll: '___r___'; lf.
	aStream decreaseIndent; nextPutAll: '] value)'
%
method: ListCompAst
elt
	^elt
%
method: ListCompAst
elt: newValue
	elt := newValue
%
method: ListCompAst
generators
	^generators
%
method: ListCompAst
generators: newValue
	generators := newValue
%

category: 'Grail-IR Codegen'
method: ListCompAst
___irEligibleValueLocals___: localNames
	"Emittable when the clause structure is one ___emitIRGenerators___:...
	binds (synchronous; Name or tuple-of-Name targets), every iterable and
	filter is emittable in its scope, and the element is emittable in the
	comprehension's scope -- the enclosing locals plus the clause targets
	(cut 57)."

	(ComprehensionAst ___irRefusal___: generators) notNil ifTrue: [^ false].
	(ComprehensionAst ___irClausesEligible___: generators locals: localNames) ifFalse: [^ false].
	^ elt ___irEligibleValueLocals___:
		(ComprehensionAst ___irScopeLocals___: localNames generators: generators)
%

category: 'Grail-IR Codegen'
method: ListCompAst
___irChildLocals___: localSet
	^ ComprehensionAst ___irScopeLocals___: localSet generators: generators
%

category: 'Grail-IR Codegen'
method: ListCompAst
___irRefusalDetail___: localSet
	^ (ComprehensionAst ___irRefusal___: generators) ifNil: [#'ListCompAst:other']
%

category: 'Grail-IR Codegen'
method: ListCompAst
___irReadLocalNamesInto___: aSet locals: localSet
	ComprehensionAst ___irReadsOf___: generators parts: { elt } into: aSet locals: localSet.
	^ self
%

category: 'Grail-IR Codegen'
method: ListCompAst
___emitIRValueOn___: aBuilder
	"printSmalltalkOn:'s accumulator block, statement for statement:

	    ([| ___r___ |
	      ___r___ := (OrderedCollection perform: #new env: 0).
	      <generators, innermost: ___r___ @env0:add: (elt).>
	      ___r___
	    ] value)

	The accumulator is a block temp, as in the text, so a comprehension nested
	in the element has its own."

	| outer |
	aBuilder at: self beginPosition.
	outer := aBuilder blockWithTemps: { #'___r___' } do: [:leaves |
		| rLeaf |
		rLeaf := leaves first.
		aBuilder at: self beginPosition.
		aBuilder add: (aBuilder assign: rLeaf from: (aBuilder
			send: #new to: (aBuilder globalNamed: #OrderedCollection) with: { } env: 0)).
		ComprehensionAst ___emitIRGenerators___: generators from: 1 on: aBuilder
			innerBody: [
				| v |
				v := elt ___emitIRValueOn___: aBuilder.
				aBuilder at: elt beginPosition.
				aBuilder add: (aBuilder send: #add: to: (aBuilder var: rLeaf) with: { v } env: 0)]
			outerSource: nil.
		aBuilder at: self beginPosition.
		aBuilder add: (aBuilder var: rLeaf)].
	aBuilder at: self beginPosition.
	^ aBuilder send: #value to: outer with: { } env: 0
%
