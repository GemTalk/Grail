Class {
	#name : 'DefaultsAndAttrsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'SUnit'
}

{ #category : 'Setup' }
DefaultsAndAttrsTestCase >> setUp [
	"Load tests/python/defaults_and_attrs.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'defaults_and_attrs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/defaults_and_attrs.py')
		name: 'defaults_and_attrs'.

]

{ #category : 'Tests - Defaults' }
DefaultsAndAttrsTestCase >> testAllArgsOverrideDefaults [
	"first_or('skip', (7, 8, 9)) → 7"
	self assert: (testModule @env1:first_items) equals: 7.

]

{ #category : 'Tests - Defaults' }
DefaultsAndAttrsTestCase >> testAllPositional [
	"add(1, 2, 3) → 6"
	self assert: (testModule @env1:add_all3) equals: 6.

]

{ #category : 'Tests - Or/And' }
DefaultsAndAttrsTestCase >> testAndChain [
	"`1 and 2 and 3` → 3."
	self assert: (testModule @env1:and_chain) equals: 3.

]

{ #category : 'Tests - Or/And' }
DefaultsAndAttrsTestCase >> testAndPassThrough [
	"`1 and 'second'` → 'second' (all truthy, return last)."
	self assert: (testModule @env1:and_pass_through) equals: 'second'.

]

{ #category : 'Tests - Or/And' }
DefaultsAndAttrsTestCase >> testAndShortCircuit [
	"`None and 'never'` → None (the first falsy operand)."
	self assert: (testModule @env1:and_short_circuit) equals: None.

]

{ #category : 'Tests - BoundMethod-Attr' }
DefaultsAndAttrsTestCase >> testAttrLoadOfMethodIsCallable [
	"`my_append = items.append; my_append(11); my_append(22)` —
	reading `items.append` as a value yields a BoundMethod (the Object
	env-1 DNU fallback)."
	self assert: (testModule @env1:items_after) asArray equals: #(11 22).

]

{ #category : 'Tests - Chained Assign' }
DefaultsAndAttrsTestCase >> testChainedAssignAttrAndName [
	"Mixed-target chain: attribute store + name binding share the value."
	self assert: (testModule @env1:chain_d) equals: 99.
	self assert: ((testModule @env1:_chain_box) @env1:___pyAttrLoad___: #x) equals: 99.

]

{ #category : 'Tests - Chained Assign' }
DefaultsAndAttrsTestCase >> testChainedAssignNames [
	"`a = b = c = 42` binds the same value to every target.  Used in
	re._parser.SubPattern.getwidth as `lo = hi = 0`."
	self assert: (testModule @env1:chain_a) equals: 42.
	self assert: (testModule @env1:chain_b) equals: 42.
	self assert: (testModule @env1:chain_c) equals: 42.

]

{ #category : 'Tests - DNU Varargs' }
DefaultsAndAttrsTestCase >> testDnuVarargsFallbackThreeArgs [
	"Same, with 3 positional args."
	self assert: (testModule @env1:varargs_dnu_three) equals: 6.

]

{ #category : 'Tests - DNU Varargs' }
DefaultsAndAttrsTestCase >> testDnuVarargsFallbackTwoArgs [
	"`fn(1, 2)` where `fn` is a function with defaults — the call site
	can only emit a positional selector (`name:_:`), and the receiver
	class only has the varargs form (`_name:kw:`).  Object env-1 DNU
	must bridge by dispatching `_name:kw:` with positional+nil."
	self assert: (testModule @env1:varargs_dnu_two) equals: 103.

]

{ #category : 'Tests - Dynamic Attrs' }
DefaultsAndAttrsTestCase >> testDynamicAttribute [
	"Box(7).y = 'late' — `y` is added after construction (not seen
	by __init__).  Phase B: all instance attributes live in dynamic-
	instVar storage, so post-init additions reach the same backing
	store as __init__ writes — no separate ___dict___ fallback."
	self assert: (testModule @env1:b_y) equals: 'late'.

]

{ #category : 'Tests - Dynamic Attrs' }
DefaultsAndAttrsTestCase >> testInitAttribute [
	"Box(7).x — set in __init__, lives in a real Smalltalk instVar."
	self assert: (testModule @env1:b_x) equals: 7.

]

{ #category : 'Tests - Varargs Init' }
DefaultsAndAttrsTestCase >> testInitBothArgsPassed [
	| pair |
	pair := testModule @env1:pair_two.
	self assert: (pair @env1:___pyAttrLoad___: #head) equals: 8.
	self assert: (pair @env1:___pyAttrLoad___: #tail) equals: 'rest'.

]

{ #category : 'Tests - Varargs Init' }
DefaultsAndAttrsTestCase >> testInitDefaultArgOmitted [
	"`Pair(7)` calls __init__(7) with `tail` defaulting to None.
	The class's value:value: must dispatch via the `___init__:kw:`
	varargs selector with both positional and keyword arrays."
	| pair |
	pair := testModule @env1:pair_one.
	self assert: (pair @env1:___pyAttrLoad___: #head) equals: 7.
	self assert: (pair @env1:___pyAttrLoad___: #tail) equals: None.

]

{ #category : 'Tests - Isinstance' }
DefaultsAndAttrsTestCase >> testIsinstanceIntStrFalse [
	self assert: (testModule @env1:is_int_str) equals: false.

]

{ #category : 'Tests - Isinstance' }
DefaultsAndAttrsTestCase >> testIsinstanceIntTrue [
	self assert: (testModule @env1:is_int_int) equals: true.

]

{ #category : 'Tests - Isinstance' }
DefaultsAndAttrsTestCase >> testIsinstanceListIntFalse [
	self assert: (testModule @env1:is_list_int) equals: false.

]

{ #category : 'Tests - Isinstance' }
DefaultsAndAttrsTestCase >> testIsinstanceStrTrue [
	"isinstance('hello', str) → True.  The `str` argument compiles to a
	BoundMethod on builtins; isinstance must unwrap it to Unicode7."
	self assert: (testModule @env1:is_str_str) equals: true.

]

{ #category : 'Tests - Isinstance' }
DefaultsAndAttrsTestCase >> testIsinstanceTupleIntMatches [
	self assert: (testModule @env1:is_either_b) equals: true.

]

{ #category : 'Tests - Isinstance' }
DefaultsAndAttrsTestCase >> testIsinstanceTupleNoMatch [
	self assert: (testModule @env1:is_either_c) equals: false.

]

{ #category : 'Tests - Isinstance' }
DefaultsAndAttrsTestCase >> testIsinstanceTupleStrMatches [
	"`isinstance('hello', (str, int))` → True via str branch."
	self assert: (testModule @env1:is_either_a) equals: true.

]

{ #category : 'Tests - MinMax' }
DefaultsAndAttrsTestCase >> testMaxTwoArgs [
	"`max(a, b)` returns the larger value."
	self assert: (testModule @env1:max_pair) equals: 7.

]

{ #category : 'Tests - MinMax' }
DefaultsAndAttrsTestCase >> testMinTwoArgs [
	"`min(a, b)` returns the smaller value."
	self assert: (testModule @env1:min_pair) equals: 3.

]

{ #category : 'Tests - Not Truthiness' }
DefaultsAndAttrsTestCase >> testNotEmptyList [
	"`not []` → True."
	self assert: (testModule @env1:not_empty_list) equals: true.

]

{ #category : 'Tests - Not Truthiness' }
DefaultsAndAttrsTestCase >> testNotEmptyString [
	"`not ''` → True."
	self assert: (testModule @env1:not_empty_str) equals: true.

]

{ #category : 'Tests - Not Truthiness' }
DefaultsAndAttrsTestCase >> testNotFalse [
	self assert: (testModule @env1:not_false) equals: true.

]

{ #category : 'Tests - Not Truthiness' }
DefaultsAndAttrsTestCase >> testNotFullList [
	self assert: (testModule @env1:not_full_list) equals: false.

]

{ #category : 'Tests - Not Truthiness' }
DefaultsAndAttrsTestCase >> testNotInListFalse [
	self assert: (testModule @env1:not_in_list_b) equals: false.

]

{ #category : 'Tests - Not Truthiness' }
DefaultsAndAttrsTestCase >> testNotInListTrue [
	self assert: (testModule @env1:not_in_list_a) equals: true.

]

{ #category : 'Tests - Not Truthiness' }
DefaultsAndAttrsTestCase >> testNotInStringFalse [
	"`'h' not in 'hello'` → False."
	self assert: (testModule @env1:not_in_b) equals: false.

]

{ #category : 'Tests - Not Truthiness' }
DefaultsAndAttrsTestCase >> testNotInStringTrue [
	"`'a' not in 'hello'` → True."
	self assert: (testModule @env1:not_in_a) equals: true.

]

{ #category : 'Tests - Not Truthiness' }
DefaultsAndAttrsTestCase >> testNotNone [
	"`not None` → True."
	self assert: (testModule @env1:not_none) equals: true.

]

{ #category : 'Tests - Not Truthiness' }
DefaultsAndAttrsTestCase >> testNotNonemptyString [
	self assert: (testModule @env1:not_nonempty) equals: false.

]

{ #category : 'Tests - Not Truthiness' }
DefaultsAndAttrsTestCase >> testNotOne [
	self assert: (testModule @env1:not_one) equals: false.

]

{ #category : 'Tests - Not Truthiness' }
DefaultsAndAttrsTestCase >> testNotTrue [
	self assert: (testModule @env1:not_true) equals: false.

]

{ #category : 'Tests - Not Truthiness' }
DefaultsAndAttrsTestCase >> testNotZero [
	"`not 0` → True (integer falsiness)."
	self assert: (testModule @env1:not_zero) equals: true.

]

{ #category : 'Tests - Defaults' }
DefaultsAndAttrsTestCase >> testOnePositionalTwoDefaults [
	"add(1) → 1 + 10 + 100 = 111"
	self assert: (testModule @env1:add_one) equals: 111.

]

{ #category : 'Tests - Or/And' }
DefaultsAndAttrsTestCase >> testOrAllFalsy [
	"`None or 0 or ''` → '' (the last operand)."
	self assert: (testModule @env1:or_all_falsy) equals: ''.

]

{ #category : 'Tests - Or/And' }
DefaultsAndAttrsTestCase >> testOrFirstTruthy [
	"`'x' or 'y'` → 'x' (first truthy)."
	self assert: (testModule @env1:or_first_truthy) equals: 'x'.

]

{ #category : 'Tests - Or/And' }
DefaultsAndAttrsTestCase >> testOrSkipsNone [
	"`None or 'fallback'` → 'fallback'."
	self assert: (testModule @env1:or_skips_none) equals: 'fallback'.

]

{ #category : 'Tests - Or/And' }
DefaultsAndAttrsTestCase >> testOrZeroThenString [
	self assert: (testModule @env1:or_zero_then_str) equals: 'replacement'.

]

{ #category : 'Tests - Array Iter' }
DefaultsAndAttrsTestCase >> testReversedRangeIteration [
	"`for i in range(5)[::-1]: total += i` — range[::-1] returns a
	plain Array (Interval's species is Array), and Array must be
	iterable without DNU."
	self assert: (testModule @env1:reversed_range_sum) equals: 10.

]

{ #category : 'Tests - Defaults' }
DefaultsAndAttrsTestCase >> testStringDefault [
	"first_or() → 'zero'"
	self assert: (testModule @env1:first_default) equals: 'zero'.

]

{ #category : 'Tests - Defaults' }
DefaultsAndAttrsTestCase >> testTwoPositionalOneDefault [
	"add(1, 2) → 1 + 2 + 100 = 103"
	self assert: (testModule @env1:add_two) equals: 103.

]
