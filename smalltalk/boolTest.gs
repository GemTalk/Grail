! ------------------- Remove existing behavior from boolTest
removeallmethods boolTest
removeallclassmethods boolTest
! ------------------- Class methods for boolTest
! ------------------- Instance methods for boolTest
category: 'done'
method: boolTest
test__doc__
	"bool.__doc__ should return a str"

	| doc |
	doc := (bool ___value: true) __doc__.
	self assert: (doc isKindOf: str).
%
category: 'other'
method: boolTest
test___and
	"Python 'and': if x is false, return x; else return y"

	| t f a b |
	t := bool ___value: true.
	f := bool ___value: false.

	"false and false -> false (first operand)"
	self assert: (f ___and: [f]) == f.
	"false and true -> false (first operand)"
	self assert: (f ___and: [t]) == f.
	"true and false -> false (second operand)"
	self assert: (t ___and: [f]) == f.
	"true and true -> true (second operand)"
	self assert: (t ___and: [t]) == t.

	a := str ___value: 'truthy'.
	b := str ___value: ''.

	"'' and '' -> '' (first operand)"
	self assert: (b ___and: [b]) == b.
	"'' and 'truthy' -> '' (first operand)"
	self assert: (b ___and: [a]) == b.
	"'truthy' and '' -> '' (second operand)"
	self assert: (a ___and: [b]) == b.
	"'truthy' and 'truthy' -> 'truthy' (second operand)"
	self assert: (a ___and: [a]) == a.

	a := list ___value: { 'truthy' }.
	b := list ___value: {}.

	"[] and [] -> [] (first operand)"
	self assert: (b ___and: [b]) == b.
	"[] and [x] -> [] (first operand)"
	self assert: (b ___and: [a]) == b.
	"[x] and [] -> [] (second operand)"
	self assert: (a ___and: [b]) == b.
	"[x] and [x] -> [x] (second operand)"
	self assert: (a ___and: [a]) == a.
%
category: 'other'
method: boolTest
test___or
	"Python 'or': if x is true, return x; else return y"

	| t f a b |
	t := bool ___value: true.
	f := bool ___value: false.

	"false or false -> false (second operand)"
	self assert: (f ___or: [f]) == f.
	"false or true -> true (second operand)"
	self assert: (f ___or: [t]) == t.
	"true or false -> true (first operand)"
	self assert: (t ___or: [f]) == t.
	"true or true -> true (first operand)"
	self assert: (t ___or: [t]) == t.

	a := str ___value: 'truthy'.
	b := str ___value: ''.

	"'' or '' -> '' (second operand)"
	self assert: (b ___or: [b]) == b.
	"'' or 'truthy' -> 'truthy' (second operand)"
	self assert: (b ___or: [a]) == a.
	"'truthy' or '' -> 'truthy' (first operand)"
	self assert: (a ___or: [b]) == a.
	"'truthy' or 'truthy' -> 'truthy' (first operand)"
	self assert: (a ___or: [a]) == a.

	a := list ___value: { 'truthy' }.
	b := list ___value: {}.

	"[] or [] -> [] (second operand)"
	self assert: (b ___or: [b]) == b.
	"[] or [x] -> [x] (second operand)"
	self assert: (b ___or: [a]) == a.
	"[x] or [] -> [x] (first operand)"
	self assert: (a ___or: [b]) == a.
	"[x] or [x] -> [x] (first operand)"
	self assert: (a ___or: [a]) == a.
%
category: 'other'
method: boolTest
test___shortCircuit
	"Test that and/or short-circuit (don't evaluate second operand when not needed)"

	| t f evaluated |
	t := bool ___value: true.
	f := bool ___value: false.

	"'and' should NOT evaluate second operand when first is false"
	evaluated := false.
	f ___and: [evaluated := true. t].
	self deny: evaluated.

	"'and' SHOULD evaluate second operand when first is true"
	evaluated := false.
	t ___and: [evaluated := true. f].
	self assert: evaluated.

	"'or' should NOT evaluate second operand when first is true"
	evaluated := false.
	t ___or: [evaluated := true. f].
	self deny: evaluated.

	"'or' SHOULD evaluate second operand when first is false"
	evaluated := false.
	f ___or: [evaluated := true. t].
	self assert: evaluated.
%
category: 'other'
method: boolTest
test__bool__
	"Test that bool.__bool__ returns self"

	| t f |
	t := bool ___value: true.
	f := bool ___value: false.

	self
		assert: t __bool__ == t;
		assert: f __bool__ == f;
		assert: t __bool__ ___value;
		deny: f __bool__ ___value;
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

	b := list ___value: { 'represent all non-empty lists' }.

	self
		deny: b __not__;
		assert: b __not__ __not__;
		yourself.
%
category: 'other'
method: boolTest
testBoolSingletons
	"Test that bool ___value: returns the Python singletons True and False"

	| t f |
	t := bool ___value: true.
	f := bool ___value: false.

	"Verify they are the Python singletons"
	self assert: t == (Python at: #True).
	self assert: f == (Python at: #False).

	"Verify not returns singletons"
	self assert: t __not__ == (Python at: #False).
	self assert: f __not__ == (Python at: #True).

	"Verify repeated calls return same singleton"
	self assert: (bool ___value: true) == (bool ___value: 1).
	self assert: (bool ___value: false) == (bool ___value: 0).
%
category: 'other'
method: boolTest
testPythonBooleanOperators
	"Test Python boolean operators via ModuleAst evaluate:"

	| result |
	"Python 'and' returns an operand, not a boolean"
	result := ModuleAst evaluate: '''hello'' and ''world'''.
	self assert: result ___value = 'world'.

	result := ModuleAst evaluate: ''''' and ''world'''.
	self assert: result ___value = ''.

	"Python 'or' returns an operand, not a boolean"
	result := ModuleAst evaluate: '''hello'' or ''world'''.
	self assert: result ___value = 'hello'.

	result := ModuleAst evaluate: ''''' or ''world'''.
	self assert: result ___value = 'world'.

	"not always returns a boolean (and returns singletons)"
	result := ModuleAst evaluate: 'not ''hello'''.
	self deny: result ___value.
	self assert: result == False.

	result := ModuleAst evaluate: 'not '''''.
	self assert: result ___value.
	self assert: result == True.
%
