! ------------------- Remove existing behavior from StringLiteralsTestCase
expectvalue /Metaclass3       
doit
StringLiteralsTestCase removeAllMethods.
StringLiteralsTestCase class removeAllMethods.
%
! ------------------- Class methods for StringLiteralsTestCase
! ------------------- Instance methods for StringLiteralsTestCase
set compile_env: 0
category: 'other'
method: StringLiteralsTestCase
filename

	^'StringLiterals.py'
%
category: 'other'
method: StringLiteralsTestCase
testShortStringDoubleQuotes

	| x |
	x := statements at: 2.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 6;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 6;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'vwxyz'.
%
category: 'other'
method: StringLiteralsTestCase
testShortStringSingleQuotes

	| x |
	x := statements at: 1.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 5;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 5;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'abcde'.
%
