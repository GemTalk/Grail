! ------------------- Remove existing behavior from PySlice
expectvalue /Metaclass3       
doit
PySlice removeAllMethods.
PySlice class removeAllMethods.
%
! ------------------- Class methods for PySlice
! ------------------- Instance methods for PySlice
set compile_env: 0
category: 'other'
method: PySlice
evaluate: aList
	self halt.
%
category: 'other'
method: PySlice
initialize
	"Slice(expr? lower, expr? upper, expr? step)"

	| stream next |
	stream := self stream.
	(stream peekFor: $') ifTrue: [
		lower:= self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		upper:= self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		step:= self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
%
