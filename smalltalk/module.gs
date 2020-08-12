! ------------------- Remove existing behavior from module
expectvalue /Metaclass3       
doit
module removeAllMethods.
module class removeAllMethods.
%
! ------------------- Class methods for module
set compile_env: 0
category: 'other'
classmethod: module
current
"
	module subclasses do: [:each | 
		SessionTemps current removeKey: ('Python_' , each name) asSymbol ifAbsent: [].
	].
"
	self halt.
	^SessionTemps current
		at: ('Python_' , self name) asSymbol
		ifAbsentPut: [sys current modules at: self moduleName put: self new]
%
category: 'other'
classmethod: module
moduleName

	self subclassResponsibility.
%
category: 'other'
classmethod: module
new

	^self basicNew
		initialize;
		yourself
%
! ------------------- Instance methods for module
set compile_env: 0
category: 'other'
method: module
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope

	^(self get: aSymbol)
		value: anArray
		value: aSymbolDictionary
		value: aScope
%
category: 'other'
method: module
get: aSymbol

	^globals get: aSymbol
%
category: 'other'
method: module
initialize

	globals := Namespace new.
%
set compile_env: 0
category: 'Python'
method: module
__dict__

	self halt.
%
category: 'Python'
method: module
__str__

	self halt.
%
