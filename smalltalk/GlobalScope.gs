! ------------------- Remove existing behavior from GlobalScope
expectvalue /Metaclass3       
doit
GlobalScope removeAllMethods.
GlobalScope class removeAllMethods.
%
! ------------------- Class methods for GlobalScope
! ------------------- Instance methods for GlobalScope
set compile_env: 0
category: 'other'
method: GlobalScope
associationForReadAt: aSymbol

	^variables 
		associationAt: aSymbol
		ifAbsent: [Builtins current associationForReadAt: aSymbol]
%
category: 'other'
method: GlobalScope
globals

	^self
%
category: 'other'
method: GlobalScope
isGlobalScope

	^true
%
