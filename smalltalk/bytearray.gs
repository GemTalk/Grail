! ------------------- Remove existing behavior from bytearray
expectvalue /Metaclass3       
doit
bytearray removeAllMethods.
bytearray class removeAllMethods.
%
! ------------------- Class methods for bytearray
set compile_env: 0
category: 'other'
classmethod: bytearray
new

	^self basicNew
		initialize;
		yourself
%
category: 'other'
classmethod: bytearray
withAll: aCollection

	^self basicNew
		initialize: aCollection;
		yourself
%
! ------------------- Instance methods for bytearray
set compile_env: 0
category: 'other'
method: bytearray
= anObject

	^((anObject isKindOf: bytearray) and: [b = anObject.b]) or: [(anObject isKindOf: ByteArray) and: [b = anObject]]
%
category: 'other'
method: bytearray
hash

	^b hash
%
category: 'other'
method: bytearray
initialize

	b := ByteArray new.
%
category: 'other'
method: bytearray
initialize: aCollection

	b := ByteArray withAll: aCollection.
%
set compile_env: 0
category: 'Python'
method: bytearray
__add__

	self halt.
%
category: 'Python'
method: bytearray
__alloc__

	self halt.
%
category: 'Python'
method: bytearray
__contains__

	self halt.
%
category: 'Python'
method: bytearray
__delitem__

	self halt.
%
category: 'Python'
method: bytearray
__getitem__

	self halt.
%
category: 'Python'
method: bytearray
__iadd__

	self halt.
%
category: 'Python'
method: bytearray
__imul__

	self halt.
%
category: 'Python'
method: bytearray
__iter__

	self halt.
%
category: 'Python'
method: bytearray
__len__

	self halt.
%
category: 'Python'
method: bytearray
__mod__

	self halt.
%
category: 'Python'
method: bytearray
__mul__

	self halt.
%
category: 'Python'
method: bytearray
__rmod__

	self halt.
%
category: 'Python'
method: bytearray
__rmul__

	self halt.
%
category: 'Python'
method: bytearray
__setitem__

	self halt.
%
category: 'Python'
method: bytearray
__str__

	self halt.
%
category: 'Python'
method: bytearray
append

	self halt.
%
category: 'Python'
method: bytearray
capitalize

	self halt.
%
category: 'Python'
method: bytearray
center

	self halt.
%
category: 'Python'
method: bytearray
clear

	self halt.
%
category: 'Python'
method: bytearray
copy

	self halt.
%
category: 'Python'
method: bytearray
count

	self halt.
%
category: 'Python'
method: bytearray
decode

	self halt.
%
category: 'Python'
method: bytearray
endswith

	self halt.
%
category: 'Python'
method: bytearray
expandtabs

	self halt.
%
category: 'Python'
method: bytearray
extend

	self halt.
%
category: 'Python'
method: bytearray
find

	self halt.
%
category: 'Python'
method: bytearray
fromhex

	self halt.
%
category: 'Python'
method: bytearray
hex

	self halt.
%
category: 'Python'
method: bytearray
index

	self halt.
%
category: 'Python'
method: bytearray
insert

	self halt.
%
category: 'Python'
method: bytearray
isalnum

	self halt.
%
category: 'Python'
method: bytearray
isalpha

	self halt.
%
category: 'Python'
method: bytearray
isascii

	self halt.
%
category: 'Python'
method: bytearray
isdigit

	self halt.
%
category: 'Python'
method: bytearray
islower

	self halt.
%
category: 'Python'
method: bytearray
isspace

	self halt.
%
category: 'Python'
method: bytearray
istitle

	self halt.
%
category: 'Python'
method: bytearray
isupper

	self halt.
%
category: 'Python'
method: bytearray
join

	self halt.
%
category: 'Python'
method: bytearray
ljust

	self halt.
%
category: 'Python'
method: bytearray
lower

	self halt.
%
category: 'Python'
method: bytearray
lstrip

	self halt.
%
category: 'Python'
method: bytearray
maketrans

	self halt.
%
category: 'Python'
method: bytearray
partition

	self halt.
%
category: 'Python'
method: bytearray
pop

	self halt.
%
category: 'Python'
method: bytearray
remove

	self halt.
%
category: 'Python'
method: bytearray
replace

	self halt.
%
category: 'Python'
method: bytearray
reverse

	self halt.
%
category: 'Python'
method: bytearray
rfind

	self halt.
%
category: 'Python'
method: bytearray
rindex

	self halt.
%
category: 'Python'
method: bytearray
rjust

	self halt.
%
category: 'Python'
method: bytearray
rpartition

	self halt.
%
category: 'Python'
method: bytearray
rsplit

	self halt.
%
category: 'Python'
method: bytearray
rstrip

	self halt.
%
category: 'Python'
method: bytearray
split

	self halt.
%
category: 'Python'
method: bytearray
splitlines

	self halt.
%
category: 'Python'
method: bytearray
startswith

	self halt.
%
category: 'Python'
method: bytearray
strip

	self halt.
%
category: 'Python'
method: bytearray
swapcase

	self halt.
%
category: 'Python'
method: bytearray
title

	self halt.
%
category: 'Python'
method: bytearray
translate

	self halt.
%
category: 'Python'
method: bytearray
upper

	self halt.
%
category: 'Python'
method: bytearray
zfill

	self halt.
%
