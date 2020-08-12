! ------------------- Remove existing behavior from list
expectvalue /Metaclass3       
doit
list removeAllMethods.
list class removeAllMethods.
%
! ------------------- Class methods for list
set compile_env: 0
category: 'other'
classmethod: list
containerClass

	^Array
%
category: 'other'
classmethod: list
new

	^self basicNew
		initialize;
		yourself
%
category: 'other'
classmethod: list
withAll: aCollection

	^self basicNew
		initialize: aCollection;
		yourself
%
! ------------------- Instance methods for list
set compile_env: 0
category: 'other'
method: list
append: arguments keywords: keywords

	^container add: arguments first
%
category: 'other'
method: list
at: anIndex

	[
		^super at: anIndex
	] on: OffsetError do: [:ex | 
		ex resignalAs: (IndexError new details: 'list index out of range'; yourself).
	]
%
set compile_env: 0
category: 'Python'
method: list
__add__

	self halt.
%
category: 'Python'
method: list
__contains__

	self halt.
%
category: 'Python'
method: list
__delitem__

	self halt.
%
category: 'Python'
method: list
__getitem__

	self halt.
%
category: 'Python'
method: list
__iadd__

	self halt.
%
category: 'Python'
method: list
__imul__

	self halt.
%
category: 'Python'
method: list
__iter__

	self halt.
%
category: 'Python'
method: list
__len__

	self halt.
%
category: 'Python'
method: list
__mul__

	self halt.
%
category: 'Python'
method: list
__reversed__

	self halt.
%
category: 'Python'
method: list
__rmul__

	self halt.
%
category: 'Python'
method: list
__setitem__

	self halt.
%
category: 'Python'
method: list
__str__

	self halt.
%
category: 'Python'
method: list
append

	self halt.
%
category: 'Python'
method: list
clear

	self halt.
%
category: 'Python'
method: list
copy

	self halt.
%
category: 'Python'
method: list
count

	self halt.
%
category: 'Python'
method: list
extend

	self halt.
%
category: 'Python'
method: list
index

	self halt.
%
category: 'Python'
method: list
insert

	self halt.
%
category: 'Python'
method: list
pop

	self halt.
%
category: 'Python'
method: list
remove

	self halt.
%
category: 'Python'
method: list
reverse

	self halt.
%
category: 'Python'
method: list
sort

	self halt.
%
