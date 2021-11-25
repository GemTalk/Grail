! ------------------- Remove existing behavior from passing
removeAllMethods passing
removeAllClassMethods passing
! ------------------- Class methods for passing
set compile_env: 0
category: 'Testing'
classmethod: passing
isAbstract
	"Override to true if a TestCase subclass is Abstract and should not have
	TestCase instances built from it"

	^self sunitName = #passing
%
! ------------------- Instance methods for passing
