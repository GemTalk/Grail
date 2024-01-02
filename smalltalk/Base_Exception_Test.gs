! ------------------- Remove existing behavior from Base_Exception_Test
expectvalue /Metaclass3
doit
Base_Exception_Test removeAllMethods.
Base_Exception_Test class removeAllMethods.
%
! ------------------- Class methods for Base_Exception_Test
set compile_env: 0
category: 'testing'
classmethod: Base_Exception_Test
isAbstract

	^self == Base_Exception_Test
%
! ------------------- Instance methods for Base_Exception_Test
