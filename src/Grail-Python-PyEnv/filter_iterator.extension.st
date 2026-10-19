Extension { #name : 'filter_iterator' }

{ #category : 'Grail-Instance Creation' }
filter_iterator class >> ___on: aFunction source: anIterator [
	| instance |
	instance := self ___new___.
	instance ___func: aFunction source: anIterator.
	^ instance

]

{ #category : 'Grail-Private' }
filter_iterator >> ___func: aFunction source: anIterator [
	func := aFunction.
	source := anIterator

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
