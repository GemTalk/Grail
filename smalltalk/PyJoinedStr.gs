! ------------------- Remove existing behavior from PyJoinedStr
expectvalue /Metaclass3       
doit
PyJoinedStr removeAllMethods.
PyJoinedStr class removeAllMethods.
%
! ------------------- Class methods for PyJoinedStr
! ------------------- Instance methods for PyJoinedStr
set compile_env: 0
category: 'other'
method: PyJoinedStr
_values
	^ values
%
category: 'other'
method: PyJoinedStr
children

	^super children
		addAll: values;
		yourself
%
category: 'other'
method: PyJoinedStr
initialize
	"JoinedStr(expr* values)"

	values := self collectAst: [self expression].
	self readPosition.
%
