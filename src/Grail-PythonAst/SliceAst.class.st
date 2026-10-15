"https://docs.python.org/3/library/ast.html#ast.Slice

Regular slicing (on the form lower:upper or lower:upper:step).

Can occur only inside the slice field of Subscript, either directly or as an element of Tuple.

lower is the lower bound (None if omitted).
upper is the upper bound (None if omitted).
step is the step value (None if omitted).

Example:
>>> print(ast.dump(ast.parse('a[1:2]', mode='eval'), indent=4))
Expression(
    body=Subscript(
        value=Name(id='a', ctx=Load()),
        slice=Slice(lower=Constant(value=1), upper=Constant(value=2)),
        ctx=Load()))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      SliceAbstractAst
        SliceAst(lower upper step)

"
Class {
	#name : 'SliceAst',
	#superclass : 'AbstractLocationNode',
	#instVars : [
		'lower',
		'upper',
		'step'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
SliceAst >> ___emitIRValueOn___: aBuilder [
	"(slice @env1:__new__: lo _: hi _: st) -- a real Python slice instance, None
	for an omitted bound; printSmalltalkOn:'s shape."

	| lo hi st |
	lo := lower isNil ifTrue: [aBuilder globalNamed: #None] ifFalse: [lower ___emitIRValueOn___: aBuilder].
	hi := upper isNil ifTrue: [aBuilder globalNamed: #None] ifFalse: [upper ___emitIRValueOn___: aBuilder].
	st := step isNil ifTrue: [aBuilder globalNamed: #None] ifFalse: [step ___emitIRValueOn___: aBuilder].
	aBuilder atNode: self.
	^ aBuilder send: #'__new__:_:_:' to: (aBuilder globalNamed: #slice)
		with: { lo. hi. st } env: 1

]

{ #category : 'other' }
SliceAst >> ___emitSmalltalkOn___: aStream [
	"Materialize a Python `slice` instance.  SubscriptAst's load path
	special-cases SliceAst and emits `___getslice___:_:_:` directly for
	the SequenceableCollection fast path; other contexts (store/del
	subscripts, slices passed as values, `xs[a:b, c:d]` tuples) need
	a real slice object so receivers' `__setitem__` / `__delitem__` /
	custom `__getitem__` can pattern-match.  Emit nil for any omitted
	bound; the slice class's `.indices(length)` normalizes at use."

	aStream nextPutAll: '(___slice___ @env1:__new__: '.
	lower ifNil: [aStream nextPutAll: 'None']
		ifNotNil: [lower printSmalltalkWithParenthesisOn: aStream].
	aStream nextPutAll: ' _: '.
	upper ifNil: [aStream nextPutAll: 'None']
		ifNotNil: [upper printSmalltalkWithParenthesisOn: aStream].
	aStream nextPutAll: ' _: '.
	step ifNil: [aStream nextPutAll: 'None']
		ifNotNil: [step printSmalltalkWithParenthesisOn: aStream].
	aStream nextPut: $)

]

{ #category : 'Grail-IR Codegen' }
SliceAst >> ___irEligibleValueLocals___: localNames [
	"A slice OBJECT (store / del subscripts, slices passed as values): each
	present bound must be emittable.  SubscriptAst's LOAD path special-cases a
	SliceAst and never asks this."

	^ (lower isNil or: [lower ___irEligibleValueLocals___: localNames])
		and: [(upper isNil or: [upper ___irEligibleValueLocals___: localNames])
		and: [step isNil or: [step ___irEligibleValueLocals___: localNames]]]

]

{ #category : 'Grail-IR Codegen' }
SliceAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	lower ifNotNil: [:n | n ___irReadLocalNamesInto___: aSet locals: localSet].
	upper ifNotNil: [:n | n ___irReadLocalNamesInto___: aSet locals: localSet].
	step ifNotNil: [:n | n ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self

]

{ #category : 'Grail-accessing' }
SliceAst >> lower [
	^lower

]

{ #category : 'other' }
SliceAst >> lower: newValue [
	lower := newValue

]

{ #category : 'Grail-traceback' }
SliceAst >> printSmalltalkOn: aStream [
	"Recorded, then emitted -- see AbstractNode >> ___recordingPrintSmalltalkOn___:."

	^ self ___recordingPrintSmalltalkOn___: aStream

]

{ #category : 'Grail-accessing' }
SliceAst >> step [
	^step

]

{ #category : 'other' }
SliceAst >> step: newValue [
	step := newValue

]

{ #category : 'Grail-accessing' }
SliceAst >> upper [
	^upper

]

{ #category : 'other' }
SliceAst >> upper: newValue [
	upper := newValue

]
