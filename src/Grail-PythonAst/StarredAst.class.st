"https://docs.python.org/3/library/ast.html#ast.Starred

A *var variable reference.

value holds the variable, typically a Name node.
ctx is Store if the variable is on the left side of an assignment, Load otherwise.

Example:
>>> print(ast.dump(ast.parse('a, *b = it'), indent=4))
Module(
    body=[
        Assign(
            targets=[Tuple(elts=[Name(id='a', ctx=Store()), Starred(value=Name(id='b', ctx=Store()), ctx=Store())], ctx=Store())],
            value=Name(id='it', ctx=Load()))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        StarredAst(value ctx)

"
Class {
	#name : 'StarredAst',
	#superclass : 'ExpressionAst',
	#instVars : [
		'value',
		'ctx'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
StarredAst >> ___emitIRStarArrayOn___: aBuilder [
	"``(x @env0:___pyStarToArray___)'' -- the operand as an Array, the run the
	text splices into its concatenation."

	| v |
	v := value ___emitIRValueOn___: aBuilder.
	aBuilder atNode: self.
	^ aBuilder send: #'___pyStarToArray___' to: v with: { } env: 0

]

{ #category : 'Grail-other' }
StarredAst >> ___emitSmalltalkOn___: aStream [
	"GRAIL STUB: `*x` in a call site should splice x's elements
	into the argument list.  Proper handling needs CallAst to
	detect StarredAst arguments and emit a concatenation
	(`{a. b.} , x asArray , {c. d.}`) rather than the brace-array
	literal it uses today.  Until then, emit a TypeError that
	fires at runtime — that lets modules that *declare* methods
	using `*x` in call sites (blinker's send/send_async carry it
	for forwarded kwargs through the keyword-only marker path,
	even though the actual call sites use only `**kwargs`) load
	end-to-end without crashing the codegen with an abstract-node
	error."

	aStream nextPutAll: '(TypeError ___signal___: ''*-unpack in call sites is not yet supported'')'

]

{ #category : 'Grail-IR Codegen' }
StarredAst >> ___irEligibleValueLocals___: localNames [
	"A LOAD-context ``*x'' whose operand is emittable.  Never a value on its
	own: the enclosing call / tuple / list splices it through
	___emitIRElementsArrayOn___:elts: (cut 56).  A store-context star (an
	unpacking target) stays on text."

	^ (ctx isKindOf: LoadAst) and: [value ___irEligibleValueLocals___: localNames]

]

{ #category : 'Grail-IR Codegen' }
StarredAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	value ___irReadLocalNamesInto___: aSet locals: localSet.
	^ self

]

{ #category : 'Grail-IR Codegen' }
StarredAst >> ___irRefusalDetail___: localSet [
	(ctx isKindOf: LoadAst) ifFalse: [^ #'StarredAst:storeTarget'].
	^ value ___irRefusalDetail___: localSet

]

{ #category : 'Grail-accessing' }
StarredAst >> ctx [

	^ctx

]

{ #category : 'Grail-IR Codegen' }
StarredAst >> ctx: newValue [
	ctx := newValue

]

{ #category : 'Grail-traceback' }
StarredAst >> printSmalltalkOn: aStream [
	"Recorded, then emitted -- see AbstractNode >> ___recordingPrintSmalltalkOn___:."

	^ self ___recordingPrintSmalltalkOn___: aStream

]

{ #category : 'Grail-accessing' }
StarredAst >> value [

	^value

]

{ #category : 'Grail-IR Codegen' }
StarredAst >> value: newValue [
	value := newValue

]
