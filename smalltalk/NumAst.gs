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

self error: 'deprecated'.
	n := self number. 
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
