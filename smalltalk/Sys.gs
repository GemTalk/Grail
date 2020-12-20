! ------------------- Remove existing behavior from sys
removeAllMethods sys
removeAllClassMethods sys
! ------------------- Class methods for sys
set compile_env: 0
category: 'other'
classmethod: sys
moduleName

	^#'sys'
%
! ------------------- Instance methods for sys
set compile_env: 0
category: 'functions'
method: sys
byteorder

	^System gemIsBigEndian
		ifTrue: ['big']
		ifFalse: ['little']
%
category: 'functions'
method: sys
modules

	^globals 
		at: #'modules'
		ifAbsent: [NameError signal]
%
set compile_env: 0
category: 'other'
method: sys
initialize

	super initialize.
	globals 
		at: #'__class__'					put: module;
		at: #'builtin_module_names'	put: tuple new;
		at: #'byteorder'					put: self byteorder;
		at: #'modules'						put: SymbolDictionary new;
		yourself.
%
