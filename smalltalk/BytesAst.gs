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
	stream := self stream.
	char := stream next.
	(char asUppercase == $B) ifFalse: [self error].
	s := ByteArray new.
	self string do: [:each |
		| value |
		value := each codePoint.
		value > 255 ifTrue: [self error: 'Cannot represent string as bytearray'].
		s add: value.
	].
	s := bytes withAll: s.
	self readPosition.
%
