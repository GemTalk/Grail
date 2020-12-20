! ------------------- Remove existing behavior from InstanceFunction
removeAllMethods InstanceFunction
removeAllClassMethods InstanceFunction
! ------------------- Class methods for InstanceFunction
! ------------------- Instance methods for InstanceFunction
set compile_env: 0
category: 'other'
method: InstanceFunction
callFromClass: receiver arguments: anArray keywords: aSymbolDictionary scope: aScope

	^self
		value: anArray
		value: aSymbolDictionary
		value: aScope
%
category: 'other'
method: InstanceFunction
callFromObject: receiver arguments: anArray keywords: aSymbolDictionary scope: aScope
	"a function is a callable"

	^self
		value: (Array with: receiver) , anArray
		value: aSymbolDictionary
		value: aScope
%
