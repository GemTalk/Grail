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
		aStream nextPutAll: value printString.
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
