! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- dict_keyiterator class (Python 'dict_keyiterator' type)
expectvalue /Class
doit
iterator subclass: 'dict_keyiterator'
  instVarNames: #( dict keys position)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
dict_keyiterator comment:
'Python dict_keyiterator type.

An iterator over dictionary keys. Created by calling iter() on a dict.

Instance variables:
  dict - the dictionary being iterated over (kept for reference)
  keys - array of keys from the dict (snapshot at creation)
  position - current position (0-based index)
'
%

expectvalue /Class
doit
dict_keyiterator category: 'Collections-Iterators'
%

! ===============================================================================
! dict_keyiterator - Iterator for dictionary keys
! ===============================================================================

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
dict_keyiterator removeAllMethods: 1.
dict_keyiterator class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Instance Creation'
classmethod: dict_keyiterator
___on: aDict
	"Create a new dict_keyiterator for the given dictionary"

	| iter keysArray |
	iter := self ___new___.
	keysArray := list ___new___.
	aDict @env0:keysDo: [:key |
		keysArray append: key
	].
	iter ___dict: aDict.
	iter ___keys: keysArray.
	iter ___position: 0.
	^ iter
%

category: 'Python-Internal'
method: dict_keyiterator
___dict: aDict
	"Set the dictionary being iterated over"
	dict := aDict
%

category: 'Python-Internal'
method: dict_keyiterator
___keys: keysArray
	"Set the keys array (snapshot of keys at iterator creation)"
	keys := keysArray
%

category: 'Python-Internal'
method: dict_keyiterator
___position: anInteger
	"Set the current position in the iteration"
	position := anInteger
%

category: 'Python-Type'
method: dict_keyiterator
__class__
	"Return the Python type for dict_keyiterator"
	^ dict_keyiterator
%

category: 'Python-Iterator Protocol'
method: dict_keyiterator
__iter__
	"Return self (iterators are their own iterators)"
	^ self
%

category: 'Python-Iterator Protocol'
method: dict_keyiterator
__next__
	"Return the next key from the dictionary"

	| size nextKey |
	size := keys ___size___.
	position := position ___plus___: 1.
	
	(position ___gt___: size) ifTrue: [
		StopIteration ___signal___
	].
	
	nextKey := keys ___at___: position.
	^ nextKey
%

set compile_env: 0
