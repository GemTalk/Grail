! ===============================================================================
! dict_valueiterator - Iterator for dictionary values
! ===============================================================================

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
dict_valueiterator removeAllMethods: 2.
dict_valueiterator class removeAllMethods: 2.
%

! ------------------- Class methods for dict_valueiterator
set compile_env: 2

category: 'Python-Instance Creation'
classmethod: dict_valueiterator
___on: aDict
	"Create a new dict_valueiterator for the given dictionary"

	| iter valuesArray |
	iter := self perform: #new env: 0.
	valuesArray := Array perform: #new env: 0.
	aDict perform: #valuesDo: env: 0 withArguments: {[:value |
		valuesArray perform: #add: env: 0 withArguments: {value}
	]}.
	iter perform: #___dict: env: 2 withArguments: {aDict}.
	iter perform: #___values: env: 2 withArguments: {valuesArray}.
	iter perform: #___position: env: 2 withArguments: {0}.
	^ iter
%

! ------------------- Instance methods for dict_valueiterator

category: 'Python-Type'
method: dict_valueiterator
__class__
	"Return the Python type for dict_valueiterator"
	^ dict_valueiterator
%

category: 'Python-Internal'
method: dict_valueiterator
___dict: aDict
	"Set the dictionary being iterated over"
	dict := aDict
%

category: 'Python-Internal'
method: dict_valueiterator
___values: valuesArray
	"Set the values array (snapshot of values at iterator creation)"
	values := valuesArray
%

category: 'Python-Internal'
method: dict_valueiterator
___position: anInteger
	"Set the current position in the iteration"
	position := anInteger
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
	size := values perform: #size env: 0.
	position := position perform: #+ env: 0 withArguments: {1}.
	
	(position perform: #> env: 0 withArguments: {size}) ifTrue: [
		StopIteration perform: #signal env: 0
	].
	
	nextValue := values perform: #at: env: 0 withArguments: {position}.
	^ nextValue
%

set compile_env: 0

