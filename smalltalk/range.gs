! ------------------- Remove existing behavior from range
removeAllMethods range
removeAllClassMethods range
! ------------------- Class methods for range
set compile_env: 0
category: 'Python'
classmethod: range
__call__: aPythonInt

	^(self __new__: aPythonInt) __init__: aPythonInt; yourself
%
category: 'Python'
classmethod: range
__call__: aPythonInt1 _: aPythonInt2

	^(self __new__: aPythonInt1 _: aPythonInt2) __init__: aPythonInt1 _: aPythonInt2; yourself
%
category: 'Python'
classmethod: range
__call__: aPythonInt1 _: aPythonInt2 _: aPythonInt3

	^(self __new__: aPythonInt1 _: aPythonInt2 _: aPythonInt3) __init__: aPythonInt1 _: aPythonInt2 _: aPythonInt3; yourself
%
category: 'Python'
classmethod: range
__new__: aPythonInt

	^self basicNew
%
category: 'Python'
classmethod: range
__new__: aPythonInt1 _: aPythonInt2

	^self basicNew
%
category: 'Python'
classmethod: range
__new__: aPythonInt1 _: aPythonInt2 _: aPythonInt3

	^self basicNew
%
set compile_env: 0
category: 'Smalltalk'
classmethod: range
___containerClass

	^Interval
%
! ------------------- Instance methods for range
set compile_env: 0
category: '(as yet unclassified)'
method: range
__init__: aPythonInt1 _: aPythonInt2 _: aPythonInt3

	container  := self class ___containerClass
		from: aPythonInt1 ___value
		to: aPythonInt2 ___value + (aPythonInt3 ___value > 0 ifTrue: [-1] ifFalse: [1])
		by: aPythonInt3 ___value
%
set compile_env: 0
category: 'Python'
method: range
__bool__

	^self __len__ > 0
%
category: 'Python'
method: range
__contains__: anElement

	^container includes: anElement
%
category: 'Python'
method: range
__getItem__: index

	^container at: index + 1
%
category: 'Python'
method: range
__init__: aPythonInt

	container  := self class ___containerClass from: 0 to: aPythonInt ___value.
%
category: 'Python'
method: range
__init__: aPythonInt1 _: aPythonInt2

	container  := self class ___containerClass from: aPythonInt1 ___value to: (aPythonInt2 ___value - 1)
%
category: 'Python'
method: range
__len__

	^self ___size
%
category: 'Python'
method: range
count: anElement

	^(self __contains__: anElement) ifTrue: [1] ifFalse: [0]
%
category: 'Python'
method: range
index: anElement

	^container indexOf: anElement
%
category: 'Python'
method: range
start

	^container first
%
category: 'Python'
method: range
step

	^container increment
%
category: 'Python'
method: range
stop

	^container last + 1
%
set compile_env: 0
category: 'Smalltalk'
method: range
___container
	^container
%
category: 'Smalltalk'
method: range
___size

	^self ___container size
%
category: 'Smalltalk'
method: range
___value
	^container
%
