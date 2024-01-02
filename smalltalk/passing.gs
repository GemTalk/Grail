! ------------------- Remove existing behavior from passing
expectvalue /Metaclass3
doit
passing removeAllMethods.
passing class removeAllMethods.
%
! ------------------- Class methods for passing
set compile_env: 0
category: 'Testing'
classmethod: passing
isAbstract
	"Override to true if a TestCase subclass is Abstract and should not have
	TestCase instances built from it"

	^self sunitName == #passing
%
! ------------------- Instance methods for passing
