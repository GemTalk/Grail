Extension { #name : 'zip_iterator' }

{ #category : 'Grail-Instance Creation' }
zip_iterator class >> ___construct___: positional kw: kwargs [
	"An instance of the RECEIVER class -- so ``class Z(zip)'' builds a Z --
	from zip's iterables, each iter()-ed now, and its ``strict'' keyword
	(Python/bltinmodule.c:3094-3158, zip_new)."

	| namespace iterators |
	namespace := builtins @env0:___instance___.
	iterators := Array @env0:new: positional @env0:size.
	1 @env0:to: positional @env0:size do: [:i |
		iterators @env0:at: i put: (namespace ___pyIter___: (positional @env0:at: i))].
	^ self ___on: iterators strict: (namespace ___strictKeyword___: kwargs for: 'zip')

]

{ #category : 'Grail-Instance Creation' }
zip_iterator class >> ___on: anArrayOfIterators [
	^ self ___on: anArrayOfIterators strict: false

]

{ #category : 'Grail-Instance Creation' }
zip_iterator class >> ___on: anArrayOfIterators strict: aBoolean [
	| instance |
	instance := self ___new___.
	instance ___sources: anArrayOfIterators strict: aBoolean.
	^ instance

]

{ #category : 'Grail-Introspection' }
zip_iterator class >> __name__ [
	^ self @env0:== zip_iterator
		ifTrue: ['zip']
		ifFalse: [super __name__]

]

{ #category : 'Grail-Instance Creation' }
zip_iterator class >> __new__ [
	"The arities a class call dispatches by count (Object class >>
	value:value:), which would otherwise reach object's __new__:; more
	arguments go to _new:kw:."

	^ self ___construct___: #() kw: nil

]

{ #category : 'Grail-Instance Creation' }
zip_iterator class >> __new__: anIterable [
	^ self ___construct___: { anIterable } kw: nil

]

{ #category : 'Grail-Introspection' }
zip_iterator class >> __qualname__ [
	^ self @env0:== zip_iterator
		ifTrue: ['zip']
		ifFalse: [super __qualname__]

]

{ #category : 'Grail-Instance Creation' }
zip_iterator class >> _new: positional kw: kwargs [
	"A call of the class itself -- ``z = zip; z(xs, ys)'' -- with any other
	arity or with keywords (Object class >> value:value:)."

	^ self ___construct___: positional kw: kwargs

]

{ #category : 'Grail-Instance Creation' }
zip_iterator >> ___new__: positional kw: kwargs [
	"A subclass's call: ___allocateInstance___:kw: finds this varargs
	__new__ on the instance side and sends it to the CLASS, as a Python
	``def __new__(cls, ...)'' compiles."

	^ self ___construct___: positional kw: kwargs

]

{ #category : 'Grail-Private' }
zip_iterator >> ___sources: anArrayOfIterators strict: aBoolean [
	sources := anArrayOfIterators.
	strict := aBoolean

]

{ #category : 'Grail-Iterator Protocol' }
zip_iterator >> __next__ [
	"One item from each source, as a tuple.  StopIteration from ANY
	source propagates and ends the zip (shortest-input semantics).

	Under ``strict=True'' the shortest input is an ERROR instead, so the
	StopIteration has to be caught to find out WHICH source ran out --
	see iterator >> ___strictExhausted___:sources:name:.  The plain path
	is left untouched: it must stay a bare propagate so an infinite
	source is never pulled a second time."

	| items |
	sources @env0:isEmpty ifTrue: [StopIteration ___signal___: nil].
	items := Array @env0:new: sources @env0:size.
	1 @env0:to: sources @env0:size do: [:i |
		strict @env0:== true
			ifTrue: [ | item stopped |
				stopped := false.
				item := [(sources @env0:at: i) __next__]
					@env0:on: StopIteration do: [:ex |
						stopped := true.
						ex @env0:return: nil].
				stopped ifTrue: [
					^ self ___strictExhausted___: i sources: sources name: 'zip'].
				items @env0:at: i put: item]
			ifFalse: [items @env0:at: i put: (sources @env0:at: i) __next__]].
	^ tuple @env0:withAll: items

]

{ #category : 'Grail-Pickle Support' }
zip_iterator >> __reduce__ [
	"CPython's zip_reduce: ``(type(self), tuple_of_iterators)'', plus a
	trailing ``True'' state when strict= is set.  Measured on 3.14.6:

	    zip([1],[2]).__reduce__()              -> (zip, (<it>, <it>))
	    zip([1],[2], strict=True).__reduce__()  -> (zip, (<it>, <it>), True)

	Unlike map there is no leading function, so the argument tuple is the
	sources themselves.  See map_iterator>>__reduce__ for why strict needs the
	state slot rather than an argument."

	strict @env0:== true ifTrue: [
		^ tuple @env0:withAll: {
			self ___builtinNamed___: #'zip'.
			tuple @env0:withAll: sources.
			true }].
	^ tuple @env0:withAll: {
		self ___builtinNamed___: #'zip'.
		tuple @env0:withAll: sources }

]

{ #category : 'Grail-Pickle Support' }
zip_iterator >> __setstate__: aState [
	"Restore the strict flag; see map_iterator>>__setstate__:."

	aState @env0:== true ifTrue: [strict := true].
	^ None

]
