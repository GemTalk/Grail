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
assign: aValue

	self assertContextIsStore.
	^assoc value: aValue
%
category: 'other'
method: PyName
associationAt: aSymbol

	^assoc value associationAt: aSymbol
%
category: 'other'
method: PyName
children

	^super children
		add: ctx;
		yourself
%
category: 'other'
method: PyName
evaluate
	"If the name refers to a function, return an object that can be sent #'value:value:'"

	self assertContextIsLoad.
	^assoc value
%
category: 'other'
method: PyName
initialize
	"Name(identifier id, expr_context ctx)"

	self stream peekFor: $(.
	id := self string asSymbol.
	self commaSpace.
	ctx := PyExpressionContext parent: self.
	self readPosition.
%
category: 'other'
method: PyName
printOn: aStream

	super printOn: aStream.
	assoc ifNotNil: [
		aStream nextPut: $(; 
			nextPutAll: assoc key;
			nextPut: $).
	].
%
category: 'other'
method: PyName
saveVariableAssociation

	assoc := parent associationAt: id.
%
