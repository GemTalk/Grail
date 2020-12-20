! ------------------- Remove existing behavior from JoinedStrAst
removeAllMethods JoinedStrAst
removeAllClassMethods JoinedStrAst
! ------------------- Class methods for JoinedStrAst
! ------------------- Instance methods for JoinedStrAst
set compile_env: 0
category: 'other'
method: JoinedStrAst
initialize
	"JoinedStr(expr* values)"

	values := self collectAst: [self expression].
	self readPosition.
%
