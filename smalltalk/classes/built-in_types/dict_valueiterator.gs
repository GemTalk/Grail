! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- dict_valueiterator class (Python 'dict_valueiterator' type)
expectvalue /Class
doit
iterator subclass: 'dict_valueiterator'
  instVarNames: #( dict values position)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
dict_valueiterator comment:
'Python dict_valueiterator type.

An iterator over dictionary values. Created by calling iter() on dict.values().

Instance variables:
  dict - the dictionary being iterated over (kept for reference)
  values - array of values from the dict (snapshot at creation)
  position - current position (0-based index)
'
%

expectvalue /Class
doit
dict_valueiterator category: 'Collections-Iterators'
%

! ===============================================================================
! dict_valueiterator - Iterator for dictionary values
! ===============================================================================

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
dict_valueiterator removeAllMethods: 2.
dict_valueiterator class removeAllMethods: 2.
%

set compile_env: 2

category: 'Python-Instance Creation'
classmethod: dict_valueiterator
___on: aDict
	"Create a new dict_valueiterator for the given dictionary"

	| iter valuesArray |
	iter := self ___new___.
	valuesArray := list ___new___.
	aDict perform: #valuesDo: env: 0 withArguments: {[:value |
		valuesArray append: value
	]}.
	iter ___dict: aDict.
	iter ___values: valuesArray.
	iter ___position: 0.
	^ iter
%

category: 'Python-Internal'
method: dict_valueiterator
___dict: aDict
	"Set the dictionary being iterated over"
	dict := aDict
%

category: 'Python-Internal'
method: dict_valueiterator
___position: anInteger
	"Set the current position in the iteration"
	position := anInteger
%

category: 'Python-Internal'
method: dict_valueiterator
___values: valuesArray
	"Set the values array (snapshot of values at iterator creation)"
	values := valuesArray
%

category: 'Python-Type'
method: dict_valueiterator
__class__
	"Return the Python type for dict_valueiterator"
	^ dict_valueiterator
%

category: 'Python-Iterator Protocol'
method: dict_valueiterator
__iter__
	"Return self (iterators are their own iterators)"
	^ self
%

category: 'Python-Iterator Protocol'
method: dict_valueiterator
__next__
	"Return the next value from the dictionary"

	| size nextValue |
	size := values ___size___.
	position := position ___plus___: 1.
	
	(position ___gt___: size) ifTrue: [
		StopIteration ___signal___
	].
	
	nextValue := values ___at___: position.
	^ nextValue
%

set compile_env: 0
