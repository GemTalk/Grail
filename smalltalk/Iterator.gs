! ------------------- Remove existing behavior from Iterator
expectvalue /Metaclass3       
doit
Iterator removeAllMethods.
Iterator class removeAllMethods.
%
! ------------------- Class methods for Iterator
set compile_env: 0
category: 'other'
classmethod: Iterator
onDictionary: aPyDictionary

	| sequence |
	sequence := OrderedCollection new: aPyDictionary size.
	aPyDictionary keysAndValuesDo: [:eachKey : eachValue |
		sequence add: (tuple with: eachKey with: eachValue).
	].
	^self on: sequence
%
! ------------------- Instance methods for Iterator
set compile_env: 0
category: 'other'
method: Iterator
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope
	"The iterator objects themselves are required to support the following two methods, 
		which together form the iterator protocol:
		(https://docs.python.org/3/library/stdtypes.html#iterator-types)"

	aSymbol == #'__iter__' ifTrue: [^self].
	aSymbol == #'__next__' ifTrue: [
		self atEnd ifTrue: [^StopIteration signal].
		^self next
	].
	self error: 'Invalid message!'
%
