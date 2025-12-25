! ------------------- Remove existing behavior from SetAst
removeallmethods SetAst
removeallclassmethods SetAst
! ------------------- Class methods for SetAst
! ------------------- Instance methods for SetAst
category: 'other'
method: SetAst
initialize
	"Set(expr* elts)"

	elts := self collectAst: [self expression].
	self readPosition.
%
category: 'other'
method: SetAst
printSmalltalkOn: aStream

	self halt.
%
