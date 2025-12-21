! ===============================================================================
! TypeErrorTestCase - Tests for Python TypeError
! ===============================================================================

expectvalue /Metaclass3
doit
TypeErrorTestCase removeAllMethods: 2.
TypeErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-TypeError'
method: TypeErrorTestCase
test_inheritance
	"Test that TypeError inherits from Exception."
	
	| exc |
	exc := TypeError perform: #__new__: env: 2 withArguments: { TypeError }.
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-TypeError'
method: TypeErrorTestCase
test_creation
	"Test creating a TypeError instance."
	
	| exc |
	exc := TypeError perform: #__new__: env: 2 withArguments: { TypeError }.
	self assert: exc notNil.
%
