! ------------------- Remove existing behavior from PyBytes
expectvalue /Metaclass3       
doit
PyBytes removeAllMethods.
PyBytes class removeAllMethods.
%
! ------------------- Class methods for PyBytes
! ------------------- Instance methods for PyBytes
set compile_env: 0
category: 'other'
method: PyBytes
initialize
	"Bytes(bytes s)"

	| stream char |
	stream := self stream.
	char := stream next.
	(char asUppercase == $B) ifFalse: [ self error. ].
	s := self string asByteArray.
	self readPosition.
%
