! ===============================================================================
! dict_itemiterator - Iterator for dictionary items (key-value pairs)
! ===============================================================================

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
dict_itemiterator removeAllMethods: 2.
dict_itemiterator class removeAllMethods: 2.
%

! ------------------- Class methods for dict_itemiterator
set compile_env: 2

category: 'Python-Instance Creation'
classmethod: dict_itemiterator
___on: aDict
	"Create a new dict_itemiterator for the given dictionary"

	| iter itemsArray |
	iter := self perform: #new env: 0.
	itemsArray := Array perform: #new env: 0.
	aDict perform: #keysAndValuesDo: env: 0 withArguments: {[:key :value |
		| pair |
		pair := InvariantArray perform: #with:with: env: 0 withArguments: {key. value}.
		itemsArray perform: #add: env: 0 withArguments: {pair}
	]}.
	iter perform: #___dict: env: 2 withArguments: {aDict}.
	iter perform: #___items: env: 2 withArguments: {itemsArray}.
	iter perform: #___position: env: 2 withArguments: {0}.
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
	size := items perform: #size env: 0.
	position := position perform: #+ env: 0 withArguments: {1}.
	
	(position perform: #> env: 0 withArguments: {size}) ifTrue: [
		StopIteration perform: #signal env: 0
	].
	
	nextItem := items perform: #at: env: 0 withArguments: {position}.
	^ nextItem
%

set compile_env: 0

