! ------------------- Remove existing behavior from boolTest
removeAllMethods boolTest
removeAllClassMethods boolTest
! ------------------- Class methods for boolTest
! ------------------- Instance methods for boolTest
set compile_env: 0
category: 'other'
method: boolTest
test__not__

	| b |
	b := bool ___value: true.

	self
		deny: b __not__;
		assert: (b __not__) __not__;
		yourself.
%
