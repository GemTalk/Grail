! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- zip_iterator class (Python 'zip' type)
expectvalue /Class
doit
iterator subclass: 'zip_iterator'
  instVarNames: #( sources strict)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
zip_iterator comment:
'Python zip type: the LAZY iterator returned by zip(*iterables).

Each __next__ pulls one item from every source iterator and yields the
tuple; the first exhausted source stops the whole zip.  Laziness
matters: zip(count(), count(1)) over infinite sources must not
materialize (test_itertools OOM-killed the session when zip was eager).

Instance variables:
  sources - Array of underlying iterators (already __iter__-ed)
  strict  - true when zip(..., strict=True) demands equal lengths
'
%

expectvalue /Class
doit
zip_iterator category: 'Grail-Collections-Iterators'
%

expectvalue /Metaclass3
doit
zip_iterator removeAllMethods: 1.
zip_iterator class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: zip_iterator
___on: anArrayOfIterators
	^ self ___on: anArrayOfIterators strict: false
%

category: 'Grail-Instance Creation'
classmethod: zip_iterator
___on: anArrayOfIterators strict: aBoolean
	| instance |
	instance := self ___new___.
	instance ___sources: anArrayOfIterators strict: aBoolean.
	^ instance
%

category: 'Grail-Private'
method: zip_iterator
___sources: anArrayOfIterators strict: aBoolean
	sources := anArrayOfIterators.
	strict := aBoolean
%

category: 'Grail-Iterator Protocol'
method: zip_iterator
__next__
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
%

set compile_env: 0
