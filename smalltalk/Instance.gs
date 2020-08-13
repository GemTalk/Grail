! ------------------- Remove existing behavior from Instance
expectvalue /Metaclass3       
doit
Instance removeAllMethods.
Instance class removeAllMethods.
%
! ------------------- Class methods for Instance
! ------------------- Instance methods for Instance
set compile_env: 0
category: 'other'
method: Instance
__str__
	"<__main__.MyClass object at 0x7fe9d8210400>"

	^str withAll: ((WriteStream on: Unicode7 new)
		nextPut: $<;
		nextPutAll: __class__ module name;
		nextPut: $.;
		nextPutAll: __class__ name;
		nextPutAll: ' object at 0x';
		nextPutAll: (self asOop printStringRadix: 16);
		nextPut: $>;
		contents)
%
category: 'other'
method: Instance
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
method: Instance
classAst

	^__class__
%
category: 'other'
method: Instance
get: aSymbol

	^__dict__ 
		get: aSymbol
		ifAbsent: [ AttributeError signal: '''', __class__ name asString, ''' object has no attribute ''', aSymbol asString, '''' ]
%
category: 'other'
method: Instance
initialize: aLocalScope

	__class__ := aLocalScope astNode.
	__dict__ := aLocalScope
		set: #'__class__' to: __class__;
		yourself.
%
category: 'other'
method: Instance
set: aSymbol to: anObject

	__dict__ set: aSymbol to: anObject.
%
