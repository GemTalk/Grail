! ------------------- Remove existing behavior from passing
removeallmethods passing
removeallclassmethods passing
! ------------------- Class methods for passing
category: 'Testing'
classmethod: passing
isAbstract
	"Override to true if a TestCase subclass is Abstract and should not have
	TestCase instances built from it"

	^self sunitName == #passing
%
! ------------------- Instance methods for passing
