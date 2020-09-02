! ------------------- Remove existing behavior from StaticFunction
expectvalue /Metaclass3       
doit
StaticFunction removeAllMethods.
StaticFunction class removeAllMethods.
%
! ------------------- Class methods for StaticFunction
! ------------------- Instance methods for StaticFunction
set compile_env: 0
category: 'other'
method: StaticFunction
callFromClass: receiver arguments: anArray keywords: aSymbolDictionary scope: aScope

	^self
		value: anArray
		value: aSymbolDictionary
		value: aScope
%
category: 'other'
method: StaticFunction
callFromObject: receiver arguments: anArray keywords: aSymbolDictionary scope: aScope

	^self
		value: anArray
		value: aSymbolDictionary
		value: aScope
%
