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
		ifAbsentPut: [self new].
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
associationForReadAt: aSymbol

	^dictionary 
		associationAt: aSymbol
		ifAbsent: [nil]
%
category: 'other'
method: BuiltinModule
associationForWriteAt: aSymbol

	^dictionary 
		associationAt: aSymbol
		ifAbsent: [nil]
%
category: 'other'
method: BuiltinModule
call: aSymbol withArguments: anArray keywords: aSymbolDictionary

	| assoc |
	assoc := self associationForReadAt: aSymbol.
	assoc ifNil: [self error: 'method not found!'].
	^assoc value
		value: anArray
		value: aSymbolDictionary
%
category: 'other'
method: BuiltinModule
initialize
"
	BuiltinModule subclasses do: [:each | 
		SessionTemps current removeKey: ('Python_' , each name) asSymbol ifAbsent: [].
	].
"
	dictionary := SymbolDictionary new.
%
