! ------------------- Remove existing behavior from str
removeAllMethods str
removeAllClassMethods str
! ------------------- Class methods for str
! ------------------- Instance methods for str
set compile_env: 0
category: 'Python'
method: str
__eq__: anObject

	^(anObject isKindOf: str) and: [value = anObject ___value]
%
category: 'Python'
method: str
__init__: aString

	value := aString.
%
set compile_env: 0
category: 'Smalltalk'
method: str
___string

	^value
%
category: 'Smalltalk'
method: str
___value

	^value
%
category: 'Smalltalk'
method: str
printOn: aStream

	aStream
		nextPutAll: 'str(';
		print: value;
		nextPut: $);
		yourself.
%
