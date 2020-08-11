! ------------------- Remove existing behavior from Sys
expectvalue /Metaclass3       
doit
Sys removeAllMethods.
Sys class removeAllMethods.
%
! ------------------- Class methods for Sys
set compile_env: 0
category: 'other'
classmethod: Sys
moduleName

	^#'sys'
%
! ------------------- Instance methods for Sys
set compile_env: 0
category: 'functions'
method: Sys
byteorder

	^System gemIsBigEndian
		ifTrue: ['big']
		ifFalse: ['little']
%
category: 'functions'
method: Sys
modules

	^globals at: #'modules'
%
set compile_env: 0
category: 'other'
method: Sys
initialize
"
	SessionTemps current removeKey: #'Python_Sys' ifAbsent: [].
"
	super initialize.
	globals 
		at: #'__class__'					put: BuiltinModule;
		at: #'builtin_module_names'	put: Tuple new;
		at: #'byteorder'					put: self byteorder;
		at: #'modules'						put: PyDictionary new;
		yourself.
%
