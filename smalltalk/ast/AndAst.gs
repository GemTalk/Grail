! ------------------- Remove existing behavior from AndAst
removeallmethods AndAst
removeallclassmethods AndAst
set compile_env: 0
! ------------------- Class methods for AndAst
! ------------------- Instance methods for AndAst
category: 'other'
method: AndAst
printSmalltalkOn: aStream

	values size == 2 ifTrue: [
		aStream nextPutAll: '(('.
		(values at: 1) printSmalltalkOn: aStream.
		aStream nextPutAll: ') and: ['.
		(values at: 2) printSmalltalkOn: aStream.
		aStream nextPutAll: '])'.
		^self.
	].
	self halt.
%
