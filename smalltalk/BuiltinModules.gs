! ------------------- Remove existing behavior from BuiltinModules
expectvalue /Metaclass3       
doit
BuiltinModules removeAllMethods.
BuiltinModules class removeAllMethods.
%
! ------------------- Class methods for BuiltinModules
set compile_env: 0
category: 'other'
classmethod: BuiltinModules
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
classmethod: BuiltinModules
new

	^self basicNew
		initialize;
		yourself
%
! ------------------- Instance methods for BuiltinModules
set compile_env: 0
category: 'other'
method: BuiltinModules
associationAt: aSymbol

	^dictionary 
		associationAt: aSymbol
		ifAbsent: [nil]
%
category: 'other'
method: BuiltinModules
initialize
"
	SessionTemps current removeKey: #'Python_Sys' ifAbsent: [].
"
	dictionary := SymbolDictionary new.
%
