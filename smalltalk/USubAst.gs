! ------------------- Remove existing behavior from USubAst
removeallmethods USubAst
removeallclassmethods USubAst
! ------------------- Class methods for USubAst
! ------------------- Instance methods for USubAst
category: 'other'
method: USubAst
printSmalltalkOn: aStream

	super printSmalltalkOn: aStream.
	aStream nextPutAll: ' __neg__'.
%
