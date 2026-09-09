! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for SetCompAst
expectvalue /Class
doit
ExpressionAst subclass: 'SetCompAst'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
SetCompAst comment:
'https://docs.python.org/3/library/ast.html#ast.SetComp

A set comprehension.

elt is a single node representing the part that will be evaluated for each item.
generators is a list of comprehension nodes.

Example:
>>> print(ast.dump(ast.parse(''{x for x in numbers}'', mode=''eval''), indent=4))
Expression(
    body=SetComp(
        elt=Name(id=''x'', ctx=Load()),
        generators=[comprehension(...)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        SetCompAst(elt generators)
'
%

expectvalue /Class
doit
SetCompAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from SetCompAst
removeallmethods SetCompAst
removeallclassmethods SetCompAst
set compile_env: 0
! ------------------- Class methods for SetCompAst
! ------------------- Instance methods for SetCompAst

category: 'code generation'
method: SetCompAst
printSmalltalkOn: aStream
	"{expr for t in iter [if c]* ...} -> a Set. Wraps the generators
	around an inner body that adds elt to the accumulator."

	aStream nextPutAll: '([| ___r___ |'; lf; increaseIndent.
	aStream nextPutAll: '___r___ := (set perform: #new env: 0).'; lf.
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
method: SetCompAst
elt
	^elt
%
method: SetCompAst
elt: newValue
	elt := newValue
%
method: SetCompAst
generators
	^generators
%
method: SetCompAst
generators: newValue
	generators := newValue
%

category: 'Grail-IR Codegen'
method: SetCompAst
___irEligibleValueLocals___: localNames
	"ListCompAst's rule (cut 58): synchronous clauses over Name / tuple-of-Name
	targets, iterables and filters emittable in their scopes, the element in
	the comprehension's scope."

	(ComprehensionAst ___irRefusal___: generators) notNil ifTrue: [^ false].
	(ComprehensionAst ___irClausesEligible___: generators locals: localNames) ifFalse: [^ false].
	^ elt ___irEligibleValueLocals___:
		(ComprehensionAst ___irScopeLocals___: localNames generators: generators)
%

category: 'Grail-IR Codegen'
method: SetCompAst
___irChildLocals___: localSet
	^ ComprehensionAst ___irScopeLocals___: localSet generators: generators
%

category: 'Grail-IR Codegen'
method: SetCompAst
___irRefusalDetail___: localSet
	^ (ComprehensionAst ___irRefusal___: generators) ifNil: [#'SetCompAst:other']
%

category: 'Grail-IR Codegen'
method: SetCompAst
___irReadLocalNamesInto___: aSet locals: localSet
	ComprehensionAst ___irReadsOf___: generators parts: { elt } into: aSet locals: localSet.
	^ self
%

category: 'Grail-IR Codegen'
method: SetCompAst
___emitIRValueOn___: aBuilder
	"printSmalltalkOn:'s accumulator block over ``(set perform: #new env: 0)''
	with ``___r___ @env0:add: (elt)'' as the innermost statement -- the list
	comprehension's shape with the set class and the same add:."

	| outer |
	aBuilder atNode: self.
	outer := aBuilder blockWithTemps: { #'___r___' } do: [:leaves |
		| rLeaf |
		rLeaf := leaves first.
		aBuilder atNode: self.
		aBuilder add: (aBuilder assign: rLeaf from: (aBuilder
			send: #new to: (aBuilder globalNamed: #set) with: { } env: 0)).
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
%
