! ------------------- Remove existing behavior from dict
expectvalue /Metaclass3       
doit
dict removeAllMethods.
dict class removeAllMethods.
%
! ------------------- Class methods for dict
set compile_env: 0
category: 'other'
classmethod: dict
new

	^self basicNew
		initialize;
		yourself
%
! ------------------- Instance methods for dict
set compile_env: 0
category: 'other'
method: dict
add: anAssociation

	^d add: anAssociation
%
category: 'other'
method: dict
associationAt: aKey

	^d associationAt: aKey
%
category: 'other'
method: dict
at: aKey

	^self get: aKey
%
category: 'other'
method: dict
at: aKey ifAbsent: aBlock

	^d at: aKey ifAbsent: aBlock
%
category: 'other'
method: dict
at: aKey ifAbsentPut: aBlock

	^d at: aKey ifAbsentPut: aBlock
%
category: 'other'
method: dict
at: aKey put: aValue

	self set: aKey to: aValue.
	^aValue
%
category: 'other'
method: dict
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope

	aSymbol == #'items' ifTrue: [^self].
	aSymbol == #'__iter__' ifTrue: [^Iterator onDictionary: self].
	self halt.
%
category: 'other'
method: dict
collect: aBlock

	| result |
	result := dict new.
	d keysAndValuesDo: [:eachKey :eachValue | result at: eachKey put: (aBlock value: eachValue)].
	^result
%
category: 'other'
method: dict
get: aKey

	^d
		at: aKey
		ifAbsent: [KeyError signal]
%
category: 'other'
method: dict
includesKey: aKey

	^d includesKey: aKey
%
category: 'other'
method: dict
initialize

	d := Dictionary new.
%
category: 'other'
method: dict
membershipIncludes: aKey
	"Smalltalk checks for values!"

	^d includesKey: aKey
%
category: 'other'
method: dict
postCopy

	d := d copy.
%
category: 'other'
method: dict
removeKey: aKey

	^d removeKey: aKey
%
category: 'other'
method: dict
removeKey: aKey ifAbsent: aBlock

	^d removeKey: aKey ifAbsent: aBlock
%
category: 'other'
method: dict
set: aKey to: aValue

	d 
		at: aKey
		put: aValue.
%
set compile_env: 0
category: 'Python'
method: dict
__contains__

	self halt.
%
category: 'Python'
method: dict
__delitem__

	self halt.
%
category: 'Python'
method: dict
__getitem__

	self halt.
%
category: 'Python'
method: dict
__iter__

	self halt.
%
category: 'Python'
method: dict
__len__

	self halt.
%
category: 'Python'
method: dict
__setitem__

	self halt.
%
category: 'Python'
method: dict
__str__

	self halt.
%
category: 'Python'
method: dict
clear

	self halt.
%
category: 'Python'
method: dict
copy

	^super copy
%
category: 'Python'
method: dict
fromkeys

	self halt.
%
category: 'Python'
method: dict
get

	self halt.
%
category: 'Python'
method: dict
items

	self halt.
%
category: 'Python'
method: dict
keys

	self halt.
%
category: 'Python'
method: dict
pop

	self halt.
%
category: 'Python'
method: dict
popitem

	self halt.
%
category: 'Python'
method: dict
setdefault

	self halt.
%
category: 'Python'
method: dict
update

	self halt.
%
category: 'Python'
method: dict
values

	self halt.
%
