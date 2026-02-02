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

category: 'Initialization'
method: gemstone
initialize
	"Initialize all module attributes with their default values."
	self
		initialize_abort;
		initialize_commit;
		initialize_objectNamed;
		yourself
%

category: 'Initialization'
method: gemstone
initialize_abort

	self ___at___: #'abort' put: [:positional :keywords |
		System perform: #'abort' env: 0.
	]
%

category: 'Initialization'
method: gemstone
initialize_commit

	self ___at___: #'commit' put: [:positional :keywords |
		System perform: #'commit' env: 0.
	]
%

category: 'Initialization'
method: gemstone
initialize_objectNamed

	self ___at___: #objectNamed put: [:positional :keywords |
		| name session |
		name := positional ___at___: 1.
		name := name perform: #'asSymbol' env: 0.
		session := GsCurrentSession perform: #'currentSession' env: 0.
		session perform: #'objectNamed:' env: 0 withArguments: { name }
	]
%

category: 'Accessors'
method: gemstone
abort

	^ self ___at___: #'abort'
%

category: 'Accessors'
method: gemstone
abort: aBlock

	self ___at___: #'abort' put: aBlock.
%

category: 'Accessors'
method: gemstone
commit

	^ self ___at___: #'commit'
%

category: 'Accessors'
method: gemstone
commit: aBlock

	self ___at___: #'commit' put: aBlock.
%

category: 'Accessors'
method: gemstone
objectNamed

	^ self ___at___: #'objectNamed'
%

category: 'Accessors'
method: gemstone
objectNamed: aBlock

	self ___at___: #'objectNamed' put: aBlock.
%

category: 'Metadata'
method: gemstone
version
	"Return the GemStone version."
	^ str ___withAll___: (System perform: #'stoneVersionAt:' env: 0 withArguments: { 'gsVersion' })
%

set compile_env: 0
