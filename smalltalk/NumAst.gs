! ------------------- Remove existing behavior from NumAst
expectvalue /Metaclass3       
doit
NumAst removeAllMethods.
NumAst class removeAllMethods.
%
! ------------------- Class methods for NumAst
! ------------------- Instance methods for NumAst
set compile_env: 0
category: 'other'
method: NumAst
evaluate: aScope
	^n
%
category: 'other'
method: NumAst
initialize
	"Num(object n) -- a number as a Object."
	| stream string x |
	stream := self stream.
	string := stream upTo: $,.
	stream skip: -1.
	(string notEmpty and: [string last == $j]) ifTrue: [
		n := complex real: 0 imag: (string copyFrom: 1 to: string size - 1) asNumber.
	] ifFalse: [
		x := string asNumber.
		n := (x isKindOf: Integer) 
			ifTrue: [int with: x]
			ifFalse: [float with: x].
	].
	self readPosition.
%
category: 'other'
method: NumAst
printOn: aStream
	super printOn: aStream.
	aStream nextPut: $(; 
		print: n;
		nextPut: $).
%
