! ------------------- Remove existing behavior from PyNum
expectvalue /Metaclass3       
doit
PyNum removeAllMethods.
PyNum class removeAllMethods.
%
! ------------------- Class methods for PyNum
! ------------------- Instance methods for PyNum
set compile_env: 0
category: 'other'
method: PyNum
evaluate
	^n
%
category: 'other'
method: PyNum
initialize
	"Num(object n) -- a number as a PyObject."
	| stream string |
	stream := self stream.
	string := stream upTo: $,.
	stream skip: -1.
	n := (string notEmpty and: [string last == $j]) ifTrue: [
		Complex real: 0 imag: (string copyFrom: 1 to: string size - 1) asNumber.
	] ifFalse: [
		string asNumber.
	].
	self readPosition.
%
category: 'other'
method: PyNum
printOn: aStream
	super printOn: aStream.
	aStream nextPut: $(; 
		print: n;
		nextPut: $).
%
set compile_env: 0
category: 'testing support'
method: PyNum
_n

	^n
%
