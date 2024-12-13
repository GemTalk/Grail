! ------------------- Remove existing behavior from NotAst
removeallmethods NotAst
removeallclassmethods NotAst
! ------------------- Class methods for NotAst
! ------------------- Instance methods for NotAst
category: 'other'
method: NotAst
printSmalltalkOn: aStream

	super printSmalltalkOn: aStream.
	aStream nextPutAll: ' __not__'.
%
