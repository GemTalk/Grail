Extension { #name : 'map_iterator' }

{ #category : 'Grail-Instance Creation' }
map_iterator class >> ___construct___: positional kw: kwargs [
	"An instance of the RECEIVER class -- so ``class M(map)'' builds an M --
	from map's arguments: a function, one or more iterables, and 3.14's
	``strict'' keyword (Python/bltinmodule.c:1366-1420, map_new).  Each
	iterable is iter()-ed now, so a non-iterable fails at the call."

	| namespace iterators isStrict |
	namespace := builtins @env0:___instance___.
	isStrict := namespace ___strictKeyword___: kwargs for: 'map'.
	positional @env0:size @env0:< 2 ifTrue: [
		^ TypeError ___signal___: 'map() must have at least two arguments.'].
	iterators := Array @env0:new: positional @env0:size @env0:- 1.
	2 @env0:to: positional @env0:size do: [:i |
		iterators @env0:at: i @env0:- 1 put: (namespace ___pyIter___: (positional @env0:at: i))].
	^ self ___on: (positional @env0:at: 1) sources: iterators strict: isStrict

]

{ #category : 'Grail-Instance Creation' }
map_iterator class >> ___on: aFunction sources: anArrayOfIterators [
	^ self ___on: aFunction sources: anArrayOfIterators strict: false

]

{ #category : 'Grail-Instance Creation' }
map_iterator class >> ___on: aFunction sources: anArrayOfIterators strict: aBoolean [
	| instance |
	instance := self ___new___.
	instance ___func: aFunction sources: anArrayOfIterators strict: aBoolean.
	^ instance

]

{ #category : 'Grail-Introspection' }
map_iterator class >> __name__ [
	^ self @env0:== map_iterator
		ifTrue: ['map']
		ifFalse: [super __name__]

]

{ #category : 'Grail-Instance Creation' }
map_iterator class >> __new__ [
	"The arities a class call dispatches by count (Object class >>
	value:value:), which would otherwise reach object's __new__:; more
	arguments go to _new:kw:."

	^ self ___construct___: #() kw: nil

]

{ #category : 'Grail-Instance Creation' }
map_iterator class >> __new__: aFunction [
	^ self ___construct___: { aFunction } kw: nil

]

{ #category : 'Grail-Introspection' }
map_iterator class >> __qualname__ [
	^ self @env0:== map_iterator
		ifTrue: ['map']
		ifFalse: [super __qualname__]

]

{ #category : 'Grail-Instance Creation' }
map_iterator class >> _new: positional kw: kwargs [
	"A call of the class itself -- ``m = map; m(f, xs)'' -- with any other
	arity or with keywords (Object class >> value:value:)."

	^ self ___construct___: positional kw: kwargs

]

{ #category : 'Grail-Private' }
map_iterator >> ___func: aFunction sources: anArrayOfIterators strict: aBoolean [
	func := aFunction.
	sources := anArrayOfIterators.
	strict := aBoolean

]

{ #category : 'Grail-Instance Creation' }
map_iterator >> ___new__: positional kw: kwargs [
	"A subclass's call: ___allocateInstance___:kw: finds this varargs
	__new__ on the instance side and sends it to the CLASS, as a Python
	``def __new__(cls, ...)'' compiles."

	^ self ___construct___: positional kw: kwargs

]

{ #category : 'Grail-Iterator Protocol' }
map_iterator >> __next__ [
	"Pull the next item from EVERY source (StopIteration from any one of
	them propagates, matching CPython -- map() stops at the shortest
	iterable), then apply func to all of them.

	3.14 gave map() the same ``strict='' keyword zip() has, with the same
	semantics and the same wording; the length check is the shared helper
	on iterator, so the two cannot drift."

	| args |
	strict @env0:== true ifTrue: [
		args := Array @env0:new: sources @env0:size.
		1 @env0:to: sources @env0:size do: [:i |
			| item stopped |
			stopped := false.
			item := [(sources @env0:at: i) __next__]
				@env0:on: StopIteration do: [:ex |
					stopped := true.
					ex @env0:return: nil].
			stopped ifTrue: [
				^ self ___strictExhausted___: i sources: sources name: 'map'].
			args @env0:at: i put: item].
		^ func value: args value: nil].
	args := sources @env0:collect: [:src | src __next__].
	^ func value: args @env0:asArray value: nil

]

{ #category : 'Grail-Pickle Support' }
map_iterator >> __reduce__ [
	"CPython's map_reduce: ``(type(self), (func, *iterators))'', plus a
	trailing ``True'' state when strict= is set.  Measured on 3.14.6:

	    map(str, [1,2]).__reduce__()              -> (map, (str, <list_iterator>))
	    map(str, [1,2], strict=True).__reduce__() -> (map, (str, <list_iterator>), True)

	The SOURCES go in as they stand, so a half-consumed map resumes where it
	left off; map() calls iter() on each and iter() answers an iterator
	unchanged.  strict cannot ride in the argument tuple because __reduce__
	args are passed positionally and strict is keyword-only, which is why
	CPython gives it a state slot and a __setstate__ -- the same reason this
	does."

	| args |
	args := Array @env0:new: sources @env0:size @env0:+ 1.
	args @env0:at: 1 put: func.
	1 @env0:to: sources @env0:size do: [:i |
		args @env0:at: i @env0:+ 1 put: (sources @env0:at: i)].
	strict @env0:== true ifTrue: [
		^ tuple @env0:withAll: {
			self ___builtinNamed___: #'map'.
			tuple @env0:withAll: args.
			true }].
	^ tuple @env0:withAll: {
		self ___builtinNamed___: #'map'.
		tuple @env0:withAll: args }

]

{ #category : 'Grail-Pickle Support' }
map_iterator >> __setstate__: aState [
	"Restore the strict flag __reduce__ could not pass positionally.  Only a
	TRUE state turns it on: CPython omits the slot entirely when strict is
	unset, so anything else must leave the default alone."

	aState @env0:== true ifTrue: [strict := true].
	^ None

]
