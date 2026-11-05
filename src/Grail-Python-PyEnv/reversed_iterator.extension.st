Extension { #name : 'reversed_iterator' }

{ #category : 'Grail-Instance Creation' }
reversed_iterator class >> ___construct___: positional kw: kwargs [
	"reversed(x) from a call's arguments: exactly one, no keywords
	(Objects/enumobject.c:424-436, reversed_vectorcall)."

	TypeError @env0:___refuseKeywordsIn___: kwargs for: 'reversed'.
	positional @env0:size @env0:= 1 ifFalse: [
		^ TypeError ___signal___: ('reversed expected 1 argument, got '
			@env0:, positional @env0:size @env0:printString)].
	^ self ___reversing___: (positional @env0:at: 1)

]

{ #category : 'Grail-Instance Creation' }
reversed_iterator class >> ___on: aSequence [
	"An instance of the RECEIVER class -- so ``class R(reversed)'' builds an R
	-- walking aSequence down from its length, taken now."

	^ self ___new___ ___source: aSequence index: ((builtins @env0:___instance___) len: aSequence) @env0:- 1

]

{ #category : 'Grail-Instance Creation' }
reversed_iterator class >> ___reversing___: aSequence [
	"CPython's reversed_new_impl (Objects/enumobject.c:380-422): the type's own
	__reversed__ when it has one, and what it answers -- a list's, a range's,
	a dict's iterator; none at all when the class bound it to None; else, for
	a sequence, a reversed object over it.  The sequence test comes first, so
	an object with __len__ but no __getitem__ is ``not reversible'', and only
	then the length, so one with __getitem__ but no __len__ ``has no len()''.

	A str, a tuple and bytes have no __reversed__ in CPython either, so they
	are reversed objects too: Grail answered an iterator over a reversed copy,
	whose type read str_iterator or list_iterator."

	| namespace |
	namespace := builtins @env0:___instance___.
	(namespace ___reversedBlocked___: aSequence)
		ifTrue: [^ namespace ___notReversible___: aSequence].
	((aSequence ___respondsTo___: #'__reversed__')
		or: [(aSequence @env0:isKindOf: PythonInstance)
			and: [(aSequence ___typeDunder___: #'__reversed__') ~~ nil]])
		ifTrue: [^ aSequence __reversed__].
	(namespace ___hasProtocolForCall___: aSequence _: '__getitem__')
		ifFalse: [^ namespace ___notReversible___: aSequence].
	(namespace ___hasProtocolForCall___: aSequence _: '__len__') ifFalse: [
		^ TypeError ___signal___: ('object of type '''
			@env0:, (aSequence ___pyTypeNameForError___) @env0:, ''' has no len()')].
	^ self ___on: aSequence

]

{ #category : 'Grail-Introspection' }
reversed_iterator class >> __name__ [
	^ self @env0:== reversed_iterator
		ifTrue: ['reversed']
		ifFalse: [super __name__]

]

{ #category : 'Grail-Instance Creation' }
reversed_iterator class >> __new__ [
	"The arities a class call dispatches by count (Object class >>
	value:value:), which would otherwise reach object's __new__:; more
	arguments go to _new:kw:."

	^ self ___construct___: #() kw: nil

]

{ #category : 'Grail-Instance Creation' }
reversed_iterator class >> __new__: aSequence [
	^ self ___construct___: { aSequence } kw: nil

]

{ #category : 'Grail-Introspection' }
reversed_iterator class >> __qualname__ [
	^ self @env0:== reversed_iterator
		ifTrue: ['reversed']
		ifFalse: [super __qualname__]

]

{ #category : 'Grail-Instance Creation' }
reversed_iterator class >> _new: positional kw: kwargs [
	"A call of the class itself -- ``r = reversed; r(xs)'' -- with any other
	arity or with keywords (Object class >> value:value:)."

	^ self ___construct___: positional kw: kwargs

]

{ #category : 'Grail-Private' }
reversed_iterator >> ___exhaust___ [
	"End the walk for good, as CPython clears the iterator's seq."

	exhausted := true.
	index := -1.
	^ StopIteration @env0:signal

]

{ #category : 'Grail-Instance Creation' }
reversed_iterator >> ___new__: positional kw: kwargs [
	"A subclass's call: ___allocateInstance___:kw: finds this varargs
	__new__ on the instance side and sends it to the CLASS, as a Python
	``def __new__(cls, ...)'' compiles."

	^ self ___construct___: positional kw: kwargs

]

{ #category : 'Grail-Private' }
reversed_iterator >> ___source: aSequence index: anIndex [
	source := aSequence.
	index := anIndex.
	exhausted := false

]

{ #category : 'Grail-Iterator Protocol' }
reversed_iterator >> __iter__ [
	"Its own iterator, defined here so the type's own __dict__ holds it, as
	seq_iterator >> __iter__ explains."

	^ self

]

{ #category : 'Grail-Iterator Protocol' }
reversed_iterator >> __length_hint__ [
	"CPython's reversed_len (Objects/enumobject.c:481-497): the items left,
	re-measuring the sequence, so one that has SHRUNK past the index has none
	left, and a __len__ that now raises propagates."

	| size position |
	exhausted ifTrue: [^ 0].
	size := (builtins @env0:___instance___) len: source.
	position := index @env0:+ 1.
	^ size @env0:< position
		ifTrue: [0]
		ifFalse: [position]

]

{ #category : 'Grail-Iterator Protocol' }
reversed_iterator >> __next__ [
	"CPython's reversed_next (Objects/enumobject.c:457-478): source[index],
	then one index lower.  An IndexError or a StopIteration from __getitem__
	ends the walk as reaching index -1 does; any other exception propagates."

	| item |
	(exhausted or: [index @env0:< 0]) ifTrue: [^ self ___exhaust___].
	item := [source __getitem__: index]
		@env0:on: (IndexError @env0:, StopIteration)
		do: [:ex | ex @env0:return: #'___reversedStop___'].
	item @env0:== #'___reversedStop___' ifTrue: [^ self ___exhaust___].
	index := index @env0:- 1.
	^ item

]

{ #category : 'Grail-Pickle Support' }
reversed_iterator >> __reduce__ [
	"CPython's reversed_reduce (Objects/enumobject.c:500-510): ``(type(self),
	(seq,), index)'', which pickle rebuilds by calling the type and then
	__setstate__; a spent one is ``(type(self), ((),))'', which reloads spent."

	exhausted ifTrue: [
		^ tuple @env0:withAll: { self @env0:class. tuple @env0:withAll: { tuple @env0:new } }].
	^ tuple @env0:withAll: { self @env0:class. tuple @env0:withAll: { source }. index }

]

{ #category : 'Grail-Pickle Support' }
reversed_iterator >> __setstate__: anIndex [
	"CPython's reversed_setstate (Objects/enumobject.c:513-538): the next index,
	clamped to -1 .. len(seq) - 1, so ``__setstate__(99)'' starts from the end
	and ``__setstate__(-5)'' leaves nothing.  A spent iterator stays spent."

	| size |
	exhausted ifTrue: [^ None].
	size := (builtins @env0:___instance___) len: source.
	index := (anIndex @env0:< -1)
		ifTrue: [-1]
		ifFalse: [anIndex @env0:min: size @env0:- 1].
	^ None

]
