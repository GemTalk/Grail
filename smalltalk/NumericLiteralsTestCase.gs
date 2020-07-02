! ------------------- Remove existing behavior from NumericLiteralsTestCase
expectvalue /Metaclass3       
doit
NumericLiteralsTestCase removeAllMethods.
NumericLiteralsTestCase class removeAllMethods.
%
! ------------------- Class methods for NumericLiteralsTestCase
! ------------------- Instance methods for NumericLiteralsTestCase
set compile_env: 0
category: 'other'
method: NumericLiteralsTestCase
filename

	^'NumericLiterals.py'
%
category: 'other'
method: NumericLiteralsTestCase
testDecimalInteger

	self
		assert: (statements at: 1) _value _n == 1;
		assert: (statements at: 2) _value _n == 1234;
		assert: (statements at: 3) _value _n == 12345;
		assert: (statements at: 4) _value _n == 0;
		yourself.
%
