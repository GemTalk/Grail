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
__class__

	^__class__
%
category: 'other'
method: Instance
__str__
	"<__main__.MyClass object at 0x7fe9d8210400>"

	^[:inst | 
		str withAll: ((WriteStream on: Unicode7 new)
			nextPut: $<;
			nextPutAll: inst __class__ module name;
			nextPut: $.;
			nextPutAll: inst __class__ name;
			nextPutAll: ' object at 0x';
			nextPutAll: (inst asOop printStringRadix: 16);
			nextPut: $>;
			contents)]
%
category: 'other'
method: Instance
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope

	| callable |
	callable := self get: aSymbol.
	^callable
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
del: aSymbol

	^ __dict__ 
		removeKey: aSymbol
		ifAbsent: [ AttributeError signal: '''', __class__ name asString, ''' object has no attribute ''', aSymbol asString, '''' ]
%
category: 'other'
method: Instance
get: aSymbol
	"This should use __getattribute__() to lookup aSymbol.
	Note, however, that we don't have to use __getattribute__() to lookup __getattribute__!
	See https://docs.python.org/3/reference/datamodel.html#special-method-lookup.
	"

	^ __dict__ 
		get: aSymbol
		ifAbsent: [ AttributeError signal: '''', __class__ name asString, ''' object has no attribute ''', aSymbol asString, '''' ]
%
category: 'other'
method: Instance
has: aSymbol

	__dict__ 
		get: aSymbol
		ifAbsent: [ ^ False ].
	^ True
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
