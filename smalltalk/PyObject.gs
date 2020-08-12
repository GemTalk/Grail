! ------------------- Remove existing behavior from PyObject
expectvalue /Metaclass3       
doit
PyObject removeAllMethods.
PyObject class removeAllMethods.
%
! ------------------- Class methods for PyObject
set compile_env: 0
category: 'other'
classmethod: PyObject
new: aLocalScope

	^self basicNew
		initialize: aLocalScope;
		yourself
%
! ------------------- Instance methods for PyObject
set compile_env: 0
category: 'other'
method: PyObject
__str__
	"<__main__.MyClass object at 0x7fe9d8210400>"

	^(WriteStream on: PyString new)
		nextPut: $<;
		nextPutAll: classAst module name;
		nextPut: $.;
		nextPutAll: classAst name;
		nextPutAll: ' object at 0x';
		nextPutAll: (self asOop printStringRadix: 16);
		nextPut: $>;
		contents
%
category: 'other'
method: PyObject
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope

	| function |
	function := self get: aSymbol.
	^function
		callFromObject: self
		arguments: anArray
		keywords: aSymbolDictionary
		scope: aScope
%
category: 'other'
method: PyObject
classAst

	^classAst
%
category: 'other'
method: PyObject
get: aSymbol

	^ variables 
		get: aSymbol
		ifAbsent: [ AttributeError signal: '''', classAst name asString, ''' object has no attribute ''', aSymbol asString, '''' ]
%
category: 'other'
method: PyObject
initialize: aLocalScope

	classAst := aLocalScope astNode.
	variables := aLocalScope
		set: #'__class__' to: classAst;
		yourself.
%
category: 'other'
method: PyObject
set: aSymbol to: anObject

	variables set: aSymbol to: anObject.
%
category: 'other'
method: PyObject
variables

	^variables
%
