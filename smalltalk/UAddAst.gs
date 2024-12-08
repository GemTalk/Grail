! ------------------- Remove existing behavior from UAddAst
removeallmethods UAddAst
removeallclassmethods UAddAst
! ------------------- Class methods for UAddAst
! ------------------- Instance methods for UAddAst
category: 'other'
method: UAddAst
printSmalltalkOn: aStream

	super printSmalltalkOn: aStream.
	aStream nextPutAll: ' __pos__'.
%
