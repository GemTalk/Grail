! ------------------- Remove existing behavior from BuiltinModule
expectvalue /Metaclass3       
doit
BuiltinModule removeAllMethods.
BuiltinModule class removeAllMethods.
%
! ------------------- Class methods for BuiltinModule
set compile_env: 0
category: 'other'
classmethod: BuiltinModule
current
"
	BuiltinModule subclasses do: [:each | 
		SessionTemps current removeKey: ('Python_' , each name) asSymbol ifAbsent: [].
	].
"
	^SessionTemps current
		at: ('Python_' , self name) asSymbol
		ifAbsentPut: [Sys current modules at: self moduleName put: self new]
%
category: 'other'
classmethod: BuiltinModule
moduleName

	self subclassResponsibility.
%
category: 'other'
classmethod: BuiltinModule
new

	^self basicNew
		initialize;
		yourself
%
! ------------------- Instance methods for BuiltinModule
set compile_env: 0
category: 'other'
method: BuiltinModule
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope

	^(self get: aSymbol)
		value: anArray
		value: aSymbolDictionary
		value: aScope
%
category: 'other'
method: BuiltinModule
get: aSymbol

	^globals get: aSymbol
%
category: 'other'
method: BuiltinModule
initialize

	globals := PyDictionary new.
%
