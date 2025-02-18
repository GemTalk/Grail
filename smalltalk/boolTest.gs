! ------------------- Remove existing behavior from boolTest
removeallmethods boolTest
removeallclassmethods boolTest
! ------------------- Class methods for boolTest
! ------------------- Instance methods for boolTest
category: 'other'
method: boolTest
test___and

	| a b |
	a := bool ___value: true.
	b := bool ___value: false.

	self
		deny: (b ___and: b);
		deny: (b ___and: a);
		deny: (a ___and: b);
		assert: (a ___and: a);
		yourself.

	a := str ___value: 'represent all non-empty strings'.
	b := str ___value: ''.

	self
		deny: (b ___and: b);
		deny: (b ___and: a);
		deny: (a ___and: b);
		assert: (a ___and: a);
		yourself.

	a := list ___value: {'represent all non-empty lists'}.
	b := list ___value: {}.

	self
		deny: (b ___and: b);
		deny: (b ___and: a);
		deny: (a ___and: b);
		assert: (a ___and: a);
		yourself.
%
category: 'other'
method: boolTest
test___or

	| a b |
	a := bool ___value: true.
	b := bool ___value: false.

	self
		deny: (b ___or: b);
		assert: (b ___or: a);
		assert: (a ___or: b);
		assert: (a ___or: a);
		yourself.

	a := str ___value: 'represent all non-empty strings'.
	b := str ___value: ''.

	self
		deny: (b ___or: b);
		assert: (b ___or: a);
		assert: (a ___or: b);
		assert: (a ___or: a);
		yourself.

	a := list ___value: {'represent all non-empty lists'}.
	b := list ___value: {}.

	self
		deny: (b ___or: b);
		assert: (b ___or: a);
		assert: (a ___or: b);
		assert: (a ___or: a);
		yourself.
%
category: 'other'
method: boolTest
test__not__

	| b |
	b := bool ___value: true.

	self
		deny: b __not__;
		assert: b __not__ __not__;
		yourself.

	b := str ___value: 'represent all non-empty strings'.

	self
		deny: b __not__;
		assert: b __not__ __not__;
		yourself.

	b := list ___value: {'represent all non-empty lists'}.

	self
		deny: b __not__;
		assert: b __not__ __not__;
		yourself.
%
