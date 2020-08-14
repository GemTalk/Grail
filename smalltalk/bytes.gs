! ------------------- Remove existing behavior from bytes
expectvalue /Metaclass3       
doit
bytes removeAllMethods.
bytes class removeAllMethods.
%
! ------------------- Class methods for bytes
set compile_env: 0
category: 'other'
classmethod: bytes
containerClass

	^ByteArray
%
! ------------------- Instance methods for bytes
set compile_env: 0
category: 'private'
method: bytes
___initialize: aCollection

	| x |
	x := aCollection.
	(x isKindOf: CharacterCollection) ifTrue: [x := x asArray collect: [:each | each codePoint]].
	container := self class containerClass withAll: x.
%
set compile_env: 0
category: 'Python'
method: bytes
__add__

	self halt.
%
category: 'Python'
method: bytes
__contains__

	self halt.
%
category: 'Python'
method: bytes
__getitem__

	self halt.
%
category: 'Python'
method: bytes
__getnewargs__

	self halt.
%
category: 'Python'
method: bytes
__iter__

	self halt.
%
category: 'Python'
method: bytes
__mod__

	self halt.
%
category: 'Python'
method: bytes
__mul__

	self halt.
%
category: 'Python'
method: bytes
__rmod__

	self halt.
%
category: 'Python'
method: bytes
__rmul__

	self halt.
%
category: 'Python'
method: bytes
__str__

	self halt.
%
category: 'Python'
method: bytes
capitalize

	self halt.
%
category: 'Python'
method: bytes
center

	self halt.
%
category: 'Python'
method: bytes
count

	self halt.
%
category: 'Python'
method: bytes
decode

	self halt.
%
category: 'Python'
method: bytes
endswith

	self halt.
%
category: 'Python'
method: bytes
expandtabs

	self halt.
%
category: 'Python'
method: bytes
find

	self halt.
%
category: 'Python'
method: bytes
fromhex

	self halt.
%
category: 'Python'
method: bytes
hex

	self halt.
%
category: 'Python'
method: bytes
index

	self halt.
%
category: 'Python'
method: bytes
isalnum

	self halt.
%
category: 'Python'
method: bytes
isalpha

	self halt.
%
category: 'Python'
method: bytes
isascii

	self halt.
%
category: 'Python'
method: bytes
isdigit

	self halt.
%
category: 'Python'
method: bytes
islower

	self halt.
%
category: 'Python'
method: bytes
isspace

	self halt.
%
category: 'Python'
method: bytes
istitle

	self halt.
%
category: 'Python'
method: bytes
isupper

	self halt.
%
category: 'Python'
method: bytes
join

	self halt.
%
category: 'Python'
method: bytes
ljust

	self halt.
%
category: 'Python'
method: bytes
lower

	self halt.
%
category: 'Python'
method: bytes
lstrip

	self halt.
%
category: 'Python'
method: bytes
maketrans

	self halt.
%
category: 'Python'
method: bytes
partition

	self halt.
%
category: 'Python'
method: bytes
replace

	self halt.
%
category: 'Python'
method: bytes
rfind

	self halt.
%
category: 'Python'
method: bytes
rindex

	self halt.
%
category: 'Python'
method: bytes
rjust

	self halt.
%
category: 'Python'
method: bytes
rpartition

	self halt.
%
category: 'Python'
method: bytes
rsplit

	self halt.
%
category: 'Python'
method: bytes
rstrip

	self halt.
%
category: 'Python'
method: bytes
split

	self halt.
%
category: 'Python'
method: bytes
splitlines

	self halt.
%
category: 'Python'
method: bytes
startswith

	self halt.
%
category: 'Python'
method: bytes
strip

	self halt.
%
category: 'Python'
method: bytes
swapcase

	self halt.
%
category: 'Python'
method: bytes
title

	self halt.
%
category: 'Python'
method: bytes
translate

	self halt.
%
category: 'Python'
method: bytes
upper

	self halt.
%
category: 'Python'
method: bytes
zfill

	self halt.
%
