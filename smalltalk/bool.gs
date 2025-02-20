! ------------------- Remove existing behavior from bool
removeallmethods bool
removeallclassmethods bool
! ------------------- Class methods for bool
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
category: 'other'
method: bool
___ignore: anObject
	"See InAst >> printSmalltalkOn:left:rightList:"
%
category: 'other'
method: bool
___value

	^value == 1
%
category: 'other'
method: bool
__and__: anObject

	| other |
	other := anObject.
	(other isKindOf: ExecBlock) ifTrue: [
		other := other value. "Evaluate the block"
	].
	^bool ___value: (self ___value and: [other ___value])
%
category: 'other'
method: bool
__not__

	^bool ___value: (value bitXor: 1)
%
category: 'other'
method: bool
__or__: anObject

	| other |
	other := anObject.
	(other isKindOf: ExecBlock) ifTrue: [
		other := other value. "Evaluate the block"
	].

	^bool ___value: (self ___value or: [other ___value])
%
category: 'Smalltalk'
method: bool
__bool__

	^self
%
category: 'Smalltalk'
method: bool
printOn: aStream

	aStream
		nextPutAll: 'bool(';
		print: (value ~= 0 ifTrue: ['True'] ifFalse: ['False']);
		nextPut: $).
%
