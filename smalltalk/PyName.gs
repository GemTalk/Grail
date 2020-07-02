! ------------------- Remove existing behavior from PyName
expectvalue /Metaclass3       
doit
PyName removeAllMethods.
PyName class removeAllMethods.
%
! ------------------- Class methods for PyName
! ------------------- Instance methods for PyName
set compile_env: 0
category: 'other'
method: PyName
assertContextIsLoad

	ctx assertIsLoad.
%
category: 'other'
method: PyName
assertContextIsStore

	ctx assertIsStore.
%
category: 'other'
method: PyName
assign: aValue in: globals

	globals at: self id put: aValue.
%
category: 'other'
method: PyName
call: aPyCall
	self assertContextIsLoad.
	^Builtins current call: aPyCall
%
category: 'other'
method: PyName
call: mySelector arguments: myArguments keywords: myKeywords
	self assertContextIsLoad.
	^Builtins current call: mySelector arguments: myArguments keywords: myKeywords
%
category: 'other'
method: PyName
evaluate
	self assertContextIsLoad.
	^parent variableAt: self
%
category: 'other'
method: PyName
id

	^id
%
category: 'other'
method: PyName
initialize
	"Name(identifier id, expr_context ctx)"

	self stream peekFor: $(.
	id := self string.
	self commaSpace.
	ctx := PyExpressionContext parent: self.
	self readPosition.
%
category: 'other'
method: PyName
printOn: aStream
	super printOn: aStream.
	aStream nextPut: $(; 
		nextPutAll: id;
		nextPut: $).
%
