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

category: 'Grail-Pickle Support'
method: map_iterator
__reduce__
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
%

category: 'Grail-Pickle Support'
method: map_iterator
__setstate__: aState
	"Restore the strict flag __reduce__ could not pass positionally.  Only a
	TRUE state turns it on: CPython omits the slot entirely when strict is
	unset, so anything else must leave the default alone."

	aState @env0:== true ifTrue: [strict := true].
	^ None
%

set compile_env: 0
