! ------------------- Remove existing behavior from range
removeAllMethods range
removeAllClassMethods range
! ------------------- Class methods for range
set compile_env: 0
category: 'Smalltalk'
classmethod: range
___containerClass

	^Interval
%
! ------------------- Instance methods for range
set compile_env: 0
category: 'Python'
method: range
__bool__

	^self __len__ > 0
%
category: 'Python'
method: range
__contains__: anElement

	^container rangeIncludes: anElement
%
category: 'Python'
method: range
__getItem__: index

	^container at: index + 1
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
___initArgs: args

	self ___initialize: args
%
category: 'Smalltalk'
method: range
___initialize: aCollection

	aCollection size == 1 ifTrue: [
		container  := self class ___containerClass from: 0 to: aCollection first.
	].

	aCollection size == 2 ifTrue: [
		container  := self class ___containerClass from: aCollection first to: (aCollection second -1)
	].

	aCollection size == 3 ifTrue: [

		container  := self class ___containerClass
			from: aCollection first
			to: aCollection second + (aCollection third > 0 ifTrue: [-1] ifFalse: [1])
			by: aCollection third
	].
%
category: 'Smalltalk'
method: range
___size

	^self ___container size
%
