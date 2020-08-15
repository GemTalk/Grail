! ------------------- Remove existing behavior from BytesAst
expectvalue /Metaclass3       
doit
BytesAst removeAllMethods.
BytesAst class removeAllMethods.
%
! ------------------- Class methods for BytesAst
! ------------------- Instance methods for BytesAst
set compile_env: 0
category: 'other'
method: BytesAst
initialize
	"Bytes(bytes s)"

	| stream char |
self error: 'deprecated'.
	stream := self stream.
	char := stream next.
	(char asUppercase == $B) ifFalse: [self error].
	s := self string.
	s := bytes withAll: s.container.
	self readPosition.
%
