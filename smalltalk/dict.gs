! ------------------- Remove existing behavior from dict
expectvalue /Metaclass3       
doit
dict removeAllMethods.
dict class removeAllMethods.
%
! ------------------- Class methods for dict
! ------------------- Instance methods for dict
set compile_env: 0
category: 'other'
method: dict
set: aKey to: aValue

	1 to: container size by: 2 do: [:i | 
		((container at: i) __eq__ value: aKey) == True ifTrue: [
			container at: i + 1 put: aValue.
			^self.
		].
	].
	container add: aKey; add: aValue.
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

	^[:collection :key | 
		[
			| array each  |
			(collection isKindOf: dict) ifFalse: [TypeError signal].
			array := collection ___container.
			1 to: array size by: 2 do: [:i | 
				each := array at: i.
				(each __eq__ value: each value: key) == True ifTrue: [Notification signal: (array at: i + 1)].
			].
			KeyError signal: key.
		] on: Notification do: [:ex | 
			ex return: ex details.
		].
	]
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
