! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- filter_iterator class (Python 'filter' type)
expectvalue /Class
doit
iterator subclass: 'filter_iterator'
  instVarNames: #( func source)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
filter_iterator comment:
'Python filter type: the LAZY iterator returned by filter(func, iterable).

Pulls from the source iterator on demand, keeping items for which
func(item) is truthy (or the item itself is truthy when func is None).
Laziness matters: filter(pred, itertools.count()) over an infinite
source must not materialize (test_itertools OOM-killed the session
when filter was eager).

Instance variables:
  func   - the predicate (a callable, or None for truthiness)
  source - the underlying iterator (already __iter__-ed)
'
%

expectvalue /Class
doit
filter_iterator category: 'Grail-Collections-Iterators'
%

expectvalue /Metaclass3
doit
filter_iterator removeAllMethods: 1.
filter_iterator class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: filter_iterator
___on: aFunction source: anIterator
	| instance |
	instance := self ___new___.
	instance ___func: aFunction source: anIterator.
	^ instance
%

category: 'Grail-Private'
method: filter_iterator
___func: aFunction source: anIterator
	func := aFunction.
	source := anIterator
%

category: 'Grail-Iterator Protocol'
method: filter_iterator
__next__
	"Advance the source until an item passes the predicate.
	StopIteration from the source propagates to the caller."

	| item keep |
	[true] @env0:whileTrue: [
		item := source __next__.
		(func @env0:== None)
			ifTrue: [keep := item ___isTruthy___]
			ifFalse: [keep := (func value: { item } value: nil) ___isTruthy___].
		keep ifTrue: [^ item]]
%

set compile_env: 0
