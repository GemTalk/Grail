! ------------------- Remove existing behavior from Other_Test
expectvalue /Metaclass3
doit
Other_Test removeAllMethods.
Other_Test class removeAllMethods.
%
! ------------------- Class methods for Other_Test
! ------------------- Instance methods for Other_Test
set compile_env: 0
category: 'testing'
method: Other_Test
should: shouldBlock raise: anException withExceptionDo: exceptBlock

	[
		shouldBlock value.
		self assert: false.
	] on: anException do: exceptBlock.
%
