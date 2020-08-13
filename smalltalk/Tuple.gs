! ------------------- Remove existing behavior from tuple
expectvalue /Metaclass3       
doit
tuple removeAllMethods.
tuple class removeAllMethods.
%
! ------------------- Class methods for tuple
set compile_env: 0
category: 'other'
classmethod: tuple
containerClass

	^Array
%
category: 'other'
classmethod: tuple
with: a with: b
	"Used to implement a dictionary iterator. 
	Remove when that is refactored!"

	^self withAll: (Array with: a with: b)
%
! ------------------- Instance methods for tuple
set compile_env: 0
category: 'other'
method: tuple
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope

	aSymbol == #'__iter__' ifTrue: [^Iterator on: self].
	self halt.
%
set compile_env: 0
category: 'Python'
method: tuple
__add__

	self halt.
%
category: 'Python'
method: tuple
__contains__

	self halt.
%
category: 'Python'
method: tuple
__getitem__

	self halt.
%
category: 'Python'
method: tuple
__getnewargs__

	self halt.
%
category: 'Python'
method: tuple
__iter__

	self halt.
%
category: 'Python'
method: tuple
__len__

	self halt.
%
category: 'Python'
method: tuple
__mul__

	self halt.
%
category: 'Python'
method: tuple
__rmul__

	self halt.
%
category: 'Python'
method: tuple
__str__

	self halt.
%
category: 'Python'
method: tuple
count

	self halt.
%
category: 'Python'
method: tuple
index

	self halt.
%
