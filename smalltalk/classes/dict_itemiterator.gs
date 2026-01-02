! ===============================================================================
! dict_itemiterator - Iterator for dictionary items (key-value pairs)
! ===============================================================================

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
dict_itemiterator removeAllMethods: 2.
dict_itemiterator class removeAllMethods: 2.
%

set compile_env: 2

! ------------------- Class methods for dict_itemiterator

category: 'Python-Instance Creation'
classmethod: dict_itemiterator
___on: aDict
	"Create a new dict_itemiterator for the given dictionary"

	| iter itemsArray |
	iter := self ___new___.
	itemsArray := list ___new___.
	aDict ___keysAndValuesDo___: [:key :value |
		| pair |
		pair := tuple ___with___: key with: value.
		itemsArray append: pair
	].
	iter ___dict: aDict.
	iter ___items: itemsArray.
	iter ___position: 0.
	^ iter
%

! ------------------- Instance methods for dict_itemiterator

category: 'Python-Type'
method: dict_itemiterator
__class__
	"Return the Python type for dict_itemiterator"
	^ dict_itemiterator
%

category: 'Python-Internal'
method: dict_itemiterator
___dict: aDict
	"Set the dictionary being iterated over"
	dict := aDict
%

category: 'Python-Internal'
method: dict_itemiterator
___items: itemsArray
	"Set the items array (snapshot of items at iterator creation)"
	items := itemsArray
%

category: 'Python-Internal'
method: dict_itemiterator
___position: anInteger
	"Set the current position in the iteration"
	position := anInteger
%

category: 'Python-Iterator Protocol'
method: dict_itemiterator
__iter__
	"Return self (iterators are their own iterators)"
	^ self
%

category: 'Python-Iterator Protocol'
method: dict_itemiterator
__next__
	"Return the next (key, value) pair from the dictionary"

	| size nextItem |
	size := items ___size___.
	position := position ___plus___: 1.
	
	(position ___gt___: size) ifTrue: [
		StopIteration ___signal___
	].
	
	nextItem := items ___at___: position.
	^ nextItem
%

set compile_env: 0
