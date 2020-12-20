! ------------------- Remove existing behavior from ExecuteTestCase
removeAllMethods ExecuteTestCase
removeAllClassMethods ExecuteTestCase
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
	module := self resources first current moduleAtPath: self class pathToTests , 'Iterators.py'.
	module evaluate.
	self assert: (x := stdout contents) = 
'1 2 
ValueError
1 2 3 4 
'.
%
category: 'other'
method: ExecuteTestCase
tstString

	module := self resources first current moduleAtPath: self class pathToTests , 'str.py'.
	module evaluate.
%
