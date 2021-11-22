! ------------------- Remove existing behavior from str
removeAllMethods str
removeAllClassMethods str
! ------------------- Class methods for str
! ------------------- Instance methods for str
set compile_env: 0
category: 'Python'
method: str
__eq__: anObject

	^(anObject isKindOf: str) and: [string = anObject ___string]
%
category: 'Python'
method: str
__init__: aString

	string := aString.
%
set compile_env: 0
category: 'Smalltalk'
method: str
___string

	^string
%
category: 'Smalltalk'
method: str
printOn: aStream

	aStream
		nextPutAll: 'str(';
		print: string;
		nextPut: $);
		yourself.
%
