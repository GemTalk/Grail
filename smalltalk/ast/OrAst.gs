! ------------------- Remove existing behavior from OrAst
removeallmethods OrAst
removeallclassmethods OrAst
set compile_env: 0
! ------------------- Class methods for OrAst
! ------------------- Instance methods for OrAst
category: 'other'
method: OrAst
printSmalltalkOn: aStream

	values size == 2 ifTrue: [
		aStream nextPutAll: '(('.
		(values at: 1) printSmalltalkOn: aStream.
		aStream nextPutAll: ') or: ['.
		(values at: 2) printSmalltalkOn: aStream.
		aStream nextPutAll: '])'.
		^self.
	].
	self halt.
%
