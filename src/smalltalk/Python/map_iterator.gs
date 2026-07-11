! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- map_iterator class (Python 'map' type)
expectvalue /Class
doit
iterator subclass: 'map_iterator'
  instVarNames: #( func source)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
map_iterator comment:
'Python map type: the LAZY iterator returned by map(func, iterable).

Pulls one item from the source per __next__ and applies func.
Laziness matches CPython (map over an infinite iterator must not
materialize) -- map() used to answer an eager LIST, which also let
non-Python code index the result; callers relying on that were bugs
by Python semantics and have been updated.

Instance variables:
  func   - the mapping callable
  source - the underlying iterator (already __iter__-ed)
'
%

expectvalue /Class
doit
map_iterator category: 'Grail-Collections-Iterators'
%

expectvalue /Metaclass3
doit
map_iterator removeAllMethods: 1.
map_iterator class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: map_iterator
___on: aFunction source: anIterator
	| instance |
	instance := self ___new___.
	instance ___func: aFunction source: anIterator.
	^ instance
%

category: 'Grail-Private'
method: map_iterator
___func: aFunction source: anIterator
	func := aFunction.
	source := anIterator
%

category: 'Grail-Iterator Protocol'
method: map_iterator
__next__
	"Apply func to the next source item.  StopIteration propagates."

	^ func value: { source __next__ } value: nil
%

set compile_env: 0
