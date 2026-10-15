"https://docs.python.org/3/library/ast.html#ast.ListComp

A list comprehension.

elt is a single node representing the part that will be evaluated for each item.
generators is a list of comprehension nodes.

Example:
>>> print(ast.dump(ast.parse('[x for x in numbers]', mode='eval'), indent=4))
Expression(
    body=ListComp(
        elt=Name(id='x', ctx=Load()),
        generators=[comprehension(...)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        ListCompAst(elt generators)

"
Class {
	#name : 'ListCompAst',
	#superclass : 'ExpressionAst',
	#instVars : [
		'elt',
		'generators'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
ListCompAst >> ___emitIRValueOn___: aBuilder [
	"printSmalltalkOn:'s accumulator block, statement for statement:

	    ([| ___r___ |
	      ___r___ := (OrderedCollection perform: #new env: 0).
	      <generators, innermost: ___r___ @env0:add: (elt).>
	      ___r___
	    ] value)

	The accumulator is a block temp, as in the text, so a comprehension nested
	in the element has its own."

	| outer |
	aBuilder atNode: self.
	outer := aBuilder blockWithTemps: { #'___r___' } do: [:leaves |
		| rLeaf |
		rLeaf := leaves first.
		aBuilder atNode: self.
		aBuilder add: (aBuilder assign: rLeaf from: (aBuilder
			send: #new to: (aBuilder globalNamed: #OrderedCollection) with: { } env: 0)).
		ComprehensionAst ___emitIRGenerators___: generators from: 1 on: aBuilder
			innerBody: [
				| v |
				v := elt ___emitIRValueOn___: aBuilder.
				aBuilder atNode: elt.
				aBuilder add: (aBuilder send: #add: to: (aBuilder var: rLeaf) with: { v } env: 0)]
			outerSource: nil.
		aBuilder atNode: self.
		aBuilder add: (aBuilder var: rLeaf)].
	aBuilder atNode: self.
	^ aBuilder send: #value to: outer with: { } env: 0

]

{ #category : 'Grail-IR Codegen' }
ListCompAst >> ___irChildLocals___: localSet [
	^ ComprehensionAst ___irScopeLocals___: localSet generators: generators

]

{ #category : 'Grail-IR Codegen' }
ListCompAst >> ___irEligibleValueLocals___: localNames [
	"Emittable when the clause structure is one ___emitIRGenerators___:...
	binds (synchronous; Name or tuple-of-Name targets), every iterable and
	filter is emittable in its scope, and the element is emittable in the
	comprehension's scope -- the enclosing locals plus the clause targets
	(cut 57)."

	(ComprehensionAst ___irRefusal___: generators) notNil ifTrue: [^ false].
	(ComprehensionAst ___irClausesEligible___: generators locals: localNames) ifFalse: [^ false].
	^ elt ___irEligibleValueLocals___:
		(ComprehensionAst ___irScopeLocals___: localNames generators: generators)

]

{ #category : 'Grail-IR Codegen' }
ListCompAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	ComprehensionAst ___irReadsOf___: generators parts: { elt } into: aSet locals: localSet.
	^ self

]

{ #category : 'Grail-IR Codegen' }
ListCompAst >> ___irRefusalDetail___: localSet [
	^ (ComprehensionAst ___irRefusal___: generators) ifNil: [#'ListCompAst:other']

]

{ #category : 'code generation' }
ListCompAst >> elt [
	^elt

]

{ #category : 'code generation' }
ListCompAst >> elt: newValue [
	elt := newValue

]

{ #category : 'code generation' }
ListCompAst >> generators [
	^generators

]

{ #category : 'code generation' }
ListCompAst >> generators: newValue [
	generators := newValue

]

{ #category : 'code generation' }
ListCompAst >> printSmalltalkOn: aStream [
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
	aStream decreaseIndent; nextPutAll: '] @env0:value)'

]
