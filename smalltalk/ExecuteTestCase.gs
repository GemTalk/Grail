! ------------------- Remove existing behavior from ExecuteTestCase
expectvalue /Metaclass3       
doit
ExecuteTestCase removeAllMethods.
ExecuteTestCase class removeAllMethods.
%
! ------------------- Class methods for ExecuteTestCase
set compile_env: 0
category: 'other'
classmethod: ExecuteTestCase
filename

	^nil
%
! ------------------- Instance methods for ExecuteTestCase
set compile_env: 0
category: 'other'
method: ExecuteTestCase
testIterator

	| x |
	module := self resources first current moduleAtPath: self testsPath , 'Iterators.py'.
	module evaluate.
	self assert: (x := stdout contents) = 
'1 2 
ValueError
1 2 3 4 
'.
%
