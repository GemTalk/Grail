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
nonlocalAssociationAt: aSymbol
	"Since we are a GlobalScope (a Block for a Module), the only 'outer' scope
	is the 'builtins' module containing a few constants and a number of functions
	to which we can send the message #'callWith:keywords:'."

	^Builtins current associationAt: aSymbol
%
