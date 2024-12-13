! ------------------- Remove existing behavior from JoinedStrAst
removeallmethods JoinedStrAst
removeallclassmethods JoinedStrAst
! ------------------- Class methods for JoinedStrAst
! ------------------- Instance methods for JoinedStrAst
category: 'other'
method: JoinedStrAst
initialize
	"JoinedStr(expr* values)"

	values := self collectAst: [self expression].
	self readPosition.
%
