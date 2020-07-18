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
	SessionTemps current 
		removeKey: #'Python_Builtins' ifAbsent: [];
		yourself.
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
associationAt: aSymbol

	^dictionary 
		associationAt: aSymbol
		ifAbsent: [nil]
%
category: 'other'
method: BuiltinModule
initialize
"
	SessionTemps current removeKey: #'Python_Sys' ifAbsent: [].
"
	dictionary := SymbolDictionary new.
%
