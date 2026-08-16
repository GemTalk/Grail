! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- map_iterator class (Python 'map' type)
expectvalue /Class
doit
iterator subclass: 'map_iterator'
  instVarNames: #( func sources strict)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
map_iterator comment:
'Python map type: the LAZY iterator returned by map(func, *iterables).

Pulls one item from EACH source per __next__ and applies func to all of
them, matching CPython''s multi-iterable map() (stops at the shortest
source).  Laziness matches CPython (map over an infinite iterator must
not materialize) -- map() used to answer an eager LIST, which also let
non-Python code index the result; callers relying on that were bugs
by Python semantics and have been updated.

Instance variables:
  func    - the mapping callable
  sources - an Array of the underlying iterators (already __iter__-ed)
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
___on: aFunction sources: anArrayOfIterators
	^ self ___on: aFunction sources: anArrayOfIterators strict: false
%

category: 'Grail-Instance Creation'
classmethod: map_iterator
___on: aFunction sources: anArrayOfIterators strict: aBoolean
	| instance |
	instance := self ___new___.
	instance ___func: aFunction sources: anArrayOfIterators strict: aBoolean.
	^ instance
%

category: 'Grail-Private'
method: map_iterator
___func: aFunction sources: anArrayOfIterators strict: aBoolean
	func := aFunction.
	sources := anArrayOfIterators.
	strict := aBoolean
%

category: 'Grail-Iterator Protocol'
method: map_iterator
__next__
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
%

set compile_env: 0
