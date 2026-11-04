Extension { #name : 'filter_iterator' }

{ #category : 'Grail-Instance Creation' }
filter_iterator class >> ___construct___: positional kw: kwargs [
	"An instance of the RECEIVER class -- so ``class F(filter)'' builds an F
	-- from filter's two arguments, a function (or None) and an iterable,
	which is iter()-ed now; filter takes no keywords
	(Python/bltinmodule.c:502-531, filter_new)."

	TypeError @env0:___refuseKeywordsIn___: kwargs for: 'filter'.
	positional @env0:size @env0:= 2 ifFalse: [
		^ TypeError ___signal___: 'filter expected 2 arguments, got '
			@env0:, positional @env0:size @env0:printString].
	^ self
		___on: (positional @env0:at: 1)
		source: ((builtins @env0:___instance___) ___pyIter___: (positional @env0:at: 2))

]

{ #category : 'Grail-Instance Creation' }
filter_iterator class >> ___on: aFunction source: anIterator [
	| instance |
	instance := self ___new___.
	instance ___func: aFunction source: anIterator.
	^ instance

]

{ #category : 'Grail-Introspection' }
filter_iterator class >> __name__ [
	^ self @env0:== filter_iterator
		ifTrue: ['filter']
		ifFalse: [super __name__]

]

{ #category : 'Grail-Instance Creation' }
filter_iterator class >> __new__ [
	"The arities a class call dispatches by count (Object class >>
	value:value:), which would otherwise reach object's __new__:; more
	arguments go to _new:kw:."

	^ self ___construct___: #() kw: nil

]

{ #category : 'Grail-Instance Creation' }
filter_iterator class >> __new__: aFunction [
	^ self ___construct___: { aFunction } kw: nil

]

{ #category : 'Grail-Introspection' }
filter_iterator class >> __qualname__ [
	^ self @env0:== filter_iterator
		ifTrue: ['filter']
		ifFalse: [super __qualname__]

]

{ #category : 'Grail-Instance Creation' }
filter_iterator class >> _new: positional kw: kwargs [
	"A call of the class itself -- ``f = filter; f(None, xs)'' -- with any
	other arity or with keywords (Object class >> value:value:)."

	^ self ___construct___: positional kw: kwargs

]

{ #category : 'Grail-Private' }
filter_iterator >> ___func: aFunction source: anIterator [
	func := aFunction.
	source := anIterator

]

{ #category : 'Grail-Instance Creation' }
filter_iterator >> ___new__: positional kw: kwargs [
	"A subclass's call: ___allocateInstance___:kw: finds this varargs
	__new__ on the instance side and sends it to the CLASS, as a Python
	``def __new__(cls, ...)'' compiles."

	^ self ___construct___: positional kw: kwargs

]

{ #category : 'Grail-Iterator Protocol' }
filter_iterator >> __next__ [
	"Advance the source until an item passes the predicate.
	StopIteration from the source propagates to the caller."

	| item keep |
	[true] @env0:whileTrue: [
		item := source __next__.
		(func == None)
			ifTrue: [keep := item ___isTruthy___]
			ifFalse: [keep := (func value: { item } value: nil) ___isTruthy___].
		keep ifTrue: [^ item]]

]

{ #category : 'Grail-Pickle Support' }
filter_iterator >> __reduce__ [
	"CPython's filter_reduce: ``(type(self), (func, iterator))''.  Measured on
	3.14.6, after one next():

	    filter(None, [1,2]).__reduce__() -> (filter, (None, <list_iterator>))

	filter has no strict= keyword, so there is no state slot.  func is passed
	through unchanged INCLUDING None, which filter() reads as ``keep truthy
	items'' -- reconstructing with None is what preserves that."

	^ tuple @env0:withAll: {
		self ___builtinNamed___: #'filter'.
		tuple @env0:withAll: { func. source } }

]
