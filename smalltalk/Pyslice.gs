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
_lower
	^ lower
%
category: 'other'
method: PySlice
_step
	^ step
%
category: 'other'
method: PySlice
_upper
	^ upper
%
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
		next := stream peekN: 4.
		next ~= 'None' ifTrue: [ lower := self expression. ] ifFalse: [ stream next: 4. ].
	].
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		upper := self expression.
	] ifFalse: [
		next := stream peekN: 4.
		next ~= 'None' ifTrue: [ upper := self expression. ] ifFalse: [ stream next: 4. ].
	].
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		step := self expression.
	] ifFalse: [
		next := stream peekN: 4.
		next ~= 'None' ifTrue: [ 
			step := self expression. 
			(stream peekFor: $)) ifFalse: [ self error. ].
		] ifFalse: [ stream next: 5. ].
	].
%
