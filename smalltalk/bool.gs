! ------------------- Remove existing behavior from bool
removeallmethods bool
removeallclassmethods bool
! ------------------- Class methods for bool
category: 'Smalltalk'
classmethod: bool
___value: anObject
	"Return the singleton True or False from the Python dictionary."

	| boolValue |
	(anObject isKindOf: Boolean) ifTrue: [
		boolValue := anObject.
	] ifFalse: [
		(anObject isKindOf: int) ifTrue: [
			boolValue := anObject ___value ~= 0.
		] ifFalse: [
			(anObject isKindOf: Number) ifTrue: [
				boolValue := anObject ~= 0.
			] ifFalse: [
				NotImplementedError signal: 'Boolean value not supported'.
			].
		].
	].
	^Python at: (boolValue ifTrue: [#True] ifFalse: [#False])
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
category: 'Python'
method: bool
__doc__

	^str ___value: 'Returns True when the argument is true, False otherwise.\n' ,
		'The builtins True and False are the only two instances of the class bool.\n' ,
		'The class bool is a subclass of the class int, and cannot be subclassed.'
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
