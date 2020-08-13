! ------------------- Remove existing behavior from JoinedStrAst
expectvalue /Metaclass3       
doit
JoinedStrAst removeAllMethods.
JoinedStrAst class removeAllMethods.
%
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
