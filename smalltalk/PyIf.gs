! ------------------- Remove existing behavior from PyIf
expectvalue /Metaclass3       
doit
PyIf removeAllMethods.
PyIf class removeAllMethods.
%
! ------------------- Class methods for PyIf
! ------------------- Instance methods for PyIf
set compile_env: 0
category: 'other'
method: PyIf
_body
	^ body
%
category: 'other'
method: PyIf
_orelse
	^ orelse
%
category: 'other'
method: PyIf
_test
	^ test
%
category: 'other'
method: PyIf
addMissingPositions
%
category: 'other'
method: PyIf
evaluate
	test evaluate
		ifTrue: [body do: [:each | each evaluate]]
		ifFalse: [orelse do: [:each | each evaluate]].
%
category: 'other'
method: PyIf
initialize
	"If(expr test, stmt* body, stmt* orelse)"

	test := self expression.
	self commaSpace.
	body := self suite.
	self commaSpace.
	orelse := self suite.
	self readPosition.
%
