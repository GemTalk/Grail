! ------------------- Remove existing behavior from StrAst
expectvalue /Metaclass3       
doit
StrAst removeAllMethods.
StrAst class removeAllMethods.
%
! ------------------- Class methods for StrAst
! ------------------- Instance methods for StrAst
set compile_env: 0
category: 'other'
method: StrAst
evaluate: aScope

	^s
%
category: 'other'
method: StrAst
initialize
	"Str(string s) -- need to specify raw, unicode, etc?"

	s := self string.
	self readPosition.
%
