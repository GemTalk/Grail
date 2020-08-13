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
containerClass

	^Dictionary
%
! ------------------- Instance methods for dict
set compile_env: 0
category: 'other'
method: dict
associationAt: aKey

	^container associationAt: aKey
%
category: 'other'
method: dict
at: aKey

	^self get: aKey
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
	container keysAndValuesDo: [:eachKey :eachValue | result at: eachKey put: (aBlock value: eachValue)].
	^result
%
category: 'other'
method: dict
get: aKey

	^container
		at: aKey
		ifAbsent: [KeyError signal]
%
category: 'other'
method: dict
includesKey: aKey

	^container includesKey: aKey
%
category: 'other'
method: dict
membershipIncludes: aKey
	"Smalltalk checks for values!"

	^container includesKey: aKey
%
category: 'other'
method: dict
removeKey: aKey

	^container removeKey: aKey
%
category: 'other'
method: dict
removeKey: aKey ifAbsent: aBlock

	^container removeKey: aKey ifAbsent: aBlock
%
category: 'other'
method: dict
set: aKey to: aValue

	container 
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
	"The builtin iter() function looks for the __iter__() method.
	https://docs.python.org/3/library/functions.html#iter

	iter(d) Return an iterator over the keys of the dictionary. 
	This is a shortcut for iter(d.keys()).
	Keys and values are iterated over in insertion order!
	https://docs.python.org/3.7/library/stdtypes.html#mapping-types-dict"
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
