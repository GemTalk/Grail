! ------------------- Remove existing behavior from InvertAst
removeallmethods InvertAst
removeallclassmethods InvertAst
! ------------------- Class methods for InvertAst
! ------------------- Instance methods for InvertAst
category: 'other'
method: InvertAst
printSmalltalkOn: aStream

	super printSmalltalkOn: aStream.
	aStream nextPutAll: ' __invert__'.
%
