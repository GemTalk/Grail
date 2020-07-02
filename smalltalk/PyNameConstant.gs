! ------------------- Remove existing behavior from PyNameConstant
expectvalue /Metaclass3       
doit
PyNameConstant removeAllMethods.
PyNameConstant class removeAllMethods.
%
! ------------------- Class methods for PyNameConstant
! ------------------- Instance methods for PyNameConstant
set compile_env: 0
category: 'other'
method: PyNameConstant
_value
	^ value
%
category: 'other'
method: PyNameConstant
evaluate
	^value
%
category: 'other'
method: PyNameConstant
initialize
	"NameConstant(singleton value)"

	|stream next |
	stream := self stream.
	next := stream upTo: $,.
	next = 'None' ifTrue: [value := nil] ifFalse: [
	next = 'True' ifTrue: [value := true] ifFalse: [
	next = 'False' ifTrue: [value := false] ifFalse: [self error: 'unrecognized constant: ', next]]].
	stream skip: -1.
	self readPosition.
%
