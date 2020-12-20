! ------------------- Remove existing behavior from BenchmarkTestCase
expectvalue /Metaclass3       
doit
BenchmarkTestCase removeAllMethods.
BenchmarkTestCase class removeAllMethods.
%
! ------------------- Class methods for BenchmarkTestCase
set compile_env: 0
category: 'other'
classmethod: BenchmarkTestCase
isAbstract
	"Override to true if a TestCase subclass is Abstract and should not have
	TestCase instances built from it"

	^self sunitName == #BenchmarkTestCase
%
! ------------------- Instance methods for BenchmarkTestCase
