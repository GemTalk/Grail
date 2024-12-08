! ------------------- Remove existing behavior from Other_Test
removeallmethods Other_Test
removeallclassmethods Other_Test
! ------------------- Class methods for Other_Test
! ------------------- Instance methods for Other_Test
category: 'testing'
method: Other_Test
should: shouldBlock raise: anException withExceptionDo: exceptBlock

	[
		shouldBlock value.
		self assert: false.
	] on: anException do: exceptBlock.
%
