! ===============================================================================
! gemstone Module (Python 'gemstone' module)
! ===============================================================================
! This file contains the Python gemstone module implementation.
! The gemstone module provides basic metadata about the Grail runtime.
! ===============================================================================

! ------------------- Remove existing Python methods from gemstone
expectvalue /Metaclass3
doit
gemstone removeAllMethods: 2.
gemstone class removeAllMethods: 2.
%

set compile_env: 2

! ------------------- Instance methods for gemstone

category: 'Python-Initialization'
method: gemstone
initialize
	"Initialize all module attributes with their default values."
	self
		yourself
%

category: 'Python-Metadata'
method: gemstone
version
	"Return the GemStone version."
	^ str ___withAll___: (System perform: #'stoneVersionAt:' env: 0 withArguments: { 'gsVersion' }) 
%

set compile_env: 0
