! ------------------- Remove existing behavior from ConstantAst
removeallmethods ConstantAst
removeallclassmethods ConstantAst
set compile_env: 0
! ------------------- Class methods for ConstantAst
! ------------------- Instance methods for ConstantAst
category: 'other'
method: ConstantAst
printSmalltalkOn: aStream

	value == true ifTrue: [
		aStream nextPutAll: 'true'.
		^self.
	].
	value == false ifTrue: [
		aStream nextPutAll: 'false'.
		^self.
	].
	value == nil ifTrue: [
		aStream nextPutAll: 'nil'.
		^self.
	].
	(value isKindOf: String) ifTrue: [
		aStream nextPutAll: value printString.
		^self.
	].
	(value isKindOf: ByteArray) ifTrue: [
		aStream nextPutAll: '#['.
		value doWithIndex: [:each :i |
			i > 1 ifTrue: [aStream nextPutAll: ' '].
			aStream print: each.
		].
		aStream nextPutAll: ']'.
		^self.
	].
	(value isKindOf: complex) ifTrue: [
		aStream
			nextPutAll: '(complex ___new___: ';
			print: (value perform: #real env: 2);
			nextPutAll: ' _: ';
			print: (value perform: #imag env: 2);
			nextPutAll: ')'.
		^self.
	].
	aStream print: value.
%
category: 'other'
method: ConstantAst
set: container to: anObject scope: aScope

	container
		set: value
		to: anObject.
%
category: 'other'
method: ConstantAst
value

	^value
%
