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
	(anObject isKindOf: int) ifTrue: [
		^self basicNew
			___value: (anObject ___value ~= 0 ifTrue: [1] ifFalse: [0]);
			yourself
	].
	(anObject isKindOf: Number) ifTrue: [
		^self basicNew
			___value: (anObject ~= 0 ifTrue: [1] ifFalse: [0]);
			yourself
	].
	NotImplementedError signal: 'Boolean value not supported'.
	#todo
%
! ------------------- Instance methods for bool
set compile_env: 0
category: 'other'
method: bool
___ignore: anObject

	"See InAst >> printSmalltalkOn:left:rightList:"


	^self
%
category: 'other'
method: bool
___value

	value == 1 ifTrue: [ ^true ].
	^false
%
category: 'other'
method: bool
__and__: anObject

	| other |
	other := anObject.
	(other isKindOf: ExecBlock) ifTrue: [
		other := other value. "Evaluate the block"
	].

	^bool ___value: (self ___value and: [ other ___value ])
%
category: 'other'
method: bool
__not__

	^bool ___value: (value bitXor: 1)
%
set compile_env: 0
category: 'Smalltalk'
method: bool
printOn: aStream

	aStream
		nextPutAll: 'bool(';
		print: (value ~= 0 ifTrue: ['True'] ifFalse: ['False']);
		nextPut: $).
%
