! ------------------- Remove existing behavior from bool
removeAllMethods bool
removeAllClassMethods bool
! ------------------- Class methods for bool
set compile_env: 0
category: 'Smalltalk'
classmethod: bool
___value: anObject

	(anObject isKindOf: Boolean) ifTrue: [
		^self basicNew
			___value: (anObject ifTrue: [1] ifFalse: [0]);
			yourself
	].
	(anObject isKindOf: Number) ifTrue: [
		^self basicNew
			___value: (anObject ~= 0 ifTrue: [1] ifFalse: [0]);
			yourself
	].
	self error: 'Boolean value not supported'.
	#todo
%
! ------------------- Instance methods for bool
set compile_env: 0
category: 'Smalltalk'
method: bool
printOn: aStream

	aStream
		nextPutAll: 'bool(';
		print: (value ~= 0 ifTrue: ['True'] ifFalse: ['False']);
		nextPut: $).
%
