! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'DefaultsAndAttrsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DefaultsAndAttrsTestCase category: 'SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
DefaultsAndAttrsTestCase removeAllMethods.
DefaultsAndAttrsTestCase class removeAllMethods.
%

! ===============================================================================
! Setup
! ===============================================================================

category: 'Setup'
method: DefaultsAndAttrsTestCase
setUp
	"Load tests/python/defaults_and_attrs.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'defaults_and_attrs' ifAbsent: [].
	UserGlobals removeKey: #'py_defaults_and_attrs' ifAbsent: [].
	UserGlobals removeKey: #'pyc_Box' ifAbsent: [].
	UserGlobals removeKey: #'pyc_Pair' ifAbsent: [].
	UserGlobals removeKey: #'pyc__ChainBox' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/defaults_and_attrs.py')
		name: 'defaults_and_attrs'.
%

! ===============================================================================
! Tests - Default arguments
! ===============================================================================

category: 'Tests - Defaults'
method: DefaultsAndAttrsTestCase
testAllPositional
	"add(1, 2, 3) → 6"
	self assert: (testModule @env1:add_all3) equals: 6.
%

category: 'Tests - Defaults'
method: DefaultsAndAttrsTestCase
testTwoPositionalOneDefault
	"add(1, 2) → 1 + 2 + 100 = 103"
	self assert: (testModule @env1:add_two) equals: 103.
%

category: 'Tests - Defaults'
method: DefaultsAndAttrsTestCase
testOnePositionalTwoDefaults
	"add(1) → 1 + 10 + 100 = 111"
	self assert: (testModule @env1:add_one) equals: 111.
%

category: 'Tests - Defaults'
method: DefaultsAndAttrsTestCase
testStringDefault
	"first_or() → 'zero'"
	self assert: (testModule @env1:first_default) equals: 'zero'.
%

category: 'Tests - Defaults'
method: DefaultsAndAttrsTestCase
testAllArgsOverrideDefaults
	"first_or('skip', (7, 8, 9)) → 7"
	self assert: (testModule @env1:first_items) equals: 7.
%

! ===============================================================================
! Tests - isinstance with builtin class names
! ===============================================================================

category: 'Tests - Isinstance'
method: DefaultsAndAttrsTestCase
testIsinstanceStrTrue
	"isinstance('hello', str) → True.  The `str` argument compiles to a
	BoundMethod on builtins; isinstance must unwrap it to Unicode7."
	self assert: (testModule @env1:is_str_str) equals: true.
%

category: 'Tests - Isinstance'
method: DefaultsAndAttrsTestCase
testIsinstanceIntStrFalse
	self assert: (testModule @env1:is_int_str) equals: false.
%

category: 'Tests - Isinstance'
method: DefaultsAndAttrsTestCase
testIsinstanceIntTrue
	self assert: (testModule @env1:is_int_int) equals: true.
%

category: 'Tests - Isinstance'
method: DefaultsAndAttrsTestCase
testIsinstanceListIntFalse
	self assert: (testModule @env1:is_list_int) equals: false.
%

category: 'Tests - Isinstance'
method: DefaultsAndAttrsTestCase
testIsinstanceTupleStrMatches
	"`isinstance('hello', (str, int))` → True via str branch."
	self assert: (testModule @env1:is_either_a) equals: true.
%

category: 'Tests - Isinstance'
method: DefaultsAndAttrsTestCase
testIsinstanceTupleIntMatches
	self assert: (testModule @env1:is_either_b) equals: true.
%

category: 'Tests - Isinstance'
method: DefaultsAndAttrsTestCase
testIsinstanceTupleNoMatch
	self assert: (testModule @env1:is_either_c) equals: false.
%

! ===============================================================================
! Tests - Dynamic per-instance attributes
! ===============================================================================

category: 'Tests - Dynamic Attrs'
method: DefaultsAndAttrsTestCase
testInitAttribute
	"Box(7).x — set in __init__, lives in a real Smalltalk instVar."
	self assert: (testModule @env1:b_x) equals: 7.
%

category: 'Tests - Dynamic Attrs'
method: DefaultsAndAttrsTestCase
testDynamicAttribute
	"Box(7).y = 'late' — `y` is NOT discovered by the __init__ scan, so
	it must flow through the PythonInstance ___dict___ fallback."
	self assert: (testModule @env1:b_y) equals: 'late'.
%

! ===============================================================================
! Tests - Varargs __init__ dispatch
! ===============================================================================

category: 'Tests - Varargs Init'
method: DefaultsAndAttrsTestCase
testInitDefaultArgOmitted
	"`Pair(7)` calls __init__(7) with `tail` defaulting to None.
	The class's value:value: must dispatch via the `___init__:kw:`
	varargs selector with both positional and keyword arrays."
	| pair |
	pair := testModule @env1:pair_one.
	self assert: pair @env1:head equals: 7.
	self assert: pair @env1:tail equals: None.
%

category: 'Tests - Varargs Init'
method: DefaultsAndAttrsTestCase
testInitBothArgsPassed
	| pair |
	pair := testModule @env1:pair_two.
	self assert: pair @env1:head equals: 8.
	self assert: pair @env1:tail equals: 'rest'.
%

! ===============================================================================
! Tests - Bound-method-via-attribute-load
! ===============================================================================

category: 'Tests - BoundMethod-Attr'
method: DefaultsAndAttrsTestCase
testAttrLoadOfMethodIsCallable
	"`my_append = items.append; my_append(11); my_append(22)` —
	reading `items.append` as a value yields a BoundMethod (the Object
	env-1 DNU fallback)."
	self assert: (testModule @env1:items_after) asArray equals: #(11 22).
%

! ===============================================================================
! Tests - `not` against non-Boolean operands (Python truthiness)
! ===============================================================================

category: 'Tests - Not Truthiness'
method: DefaultsAndAttrsTestCase
testNotZero
	"`not 0` → True (integer falsiness)."
	self assert: (testModule @env1:not_zero) equals: true.
%

category: 'Tests - Not Truthiness'
method: DefaultsAndAttrsTestCase
testNotOne
	self assert: (testModule @env1:not_one) equals: false.
%

category: 'Tests - Not Truthiness'
method: DefaultsAndAttrsTestCase
testNotEmptyString
	"`not ''` → True."
	self assert: (testModule @env1:not_empty_str) equals: true.
%

category: 'Tests - Not Truthiness'
method: DefaultsAndAttrsTestCase
testNotNonemptyString
	self assert: (testModule @env1:not_nonempty) equals: false.
%

category: 'Tests - Not Truthiness'
method: DefaultsAndAttrsTestCase
testNotEmptyList
	"`not []` → True."
	self assert: (testModule @env1:not_empty_list) equals: true.
%

category: 'Tests - Not Truthiness'
method: DefaultsAndAttrsTestCase
testNotFullList
	self assert: (testModule @env1:not_full_list) equals: false.
%

category: 'Tests - Not Truthiness'
method: DefaultsAndAttrsTestCase
testNotNone
	"`not None` → True."
	self assert: (testModule @env1:not_none) equals: true.
%

category: 'Tests - Not Truthiness'
method: DefaultsAndAttrsTestCase
testNotTrue
	self assert: (testModule @env1:not_true) equals: false.
%

category: 'Tests - Not Truthiness'
method: DefaultsAndAttrsTestCase
testNotFalse
	self assert: (testModule @env1:not_false) equals: true.
%

category: 'Tests - Not Truthiness'
method: DefaultsAndAttrsTestCase
testNotInStringTrue
	"`'a' not in 'hello'` → True."
	self assert: (testModule @env1:not_in_a) equals: true.
%

category: 'Tests - Not Truthiness'
method: DefaultsAndAttrsTestCase
testNotInStringFalse
	"`'h' not in 'hello'` → False."
	self assert: (testModule @env1:not_in_b) equals: false.
%

category: 'Tests - Not Truthiness'
method: DefaultsAndAttrsTestCase
testNotInListTrue
	self assert: (testModule @env1:not_in_list_a) equals: true.
%

category: 'Tests - Not Truthiness'
method: DefaultsAndAttrsTestCase
testNotInListFalse
	self assert: (testModule @env1:not_in_list_b) equals: false.
%

! ===============================================================================
! Tests - Python `or` / `and` value-preserving semantics
! ===============================================================================

category: 'Tests - Or/And'
method: DefaultsAndAttrsTestCase
testOrFirstTruthy
	"`'x' or 'y'` → 'x' (first truthy)."
	self assert: (testModule @env1:or_first_truthy) equals: 'x'.
%

category: 'Tests - Or/And'
method: DefaultsAndAttrsTestCase
testOrSkipsNone
	"`None or 'fallback'` → 'fallback'."
	self assert: (testModule @env1:or_skips_none) equals: 'fallback'.
%

category: 'Tests - Or/And'
method: DefaultsAndAttrsTestCase
testOrZeroThenString
	self assert: (testModule @env1:or_zero_then_str) equals: 'replacement'.
%

category: 'Tests - Or/And'
method: DefaultsAndAttrsTestCase
testOrAllFalsy
	"`None or 0 or ''` → '' (the last operand)."
	self assert: (testModule @env1:or_all_falsy) equals: ''.
%

category: 'Tests - Or/And'
method: DefaultsAndAttrsTestCase
testAndShortCircuit
	"`None and 'never'` → None (the first falsy operand)."
	self assert: (testModule @env1:and_short_circuit) equals: None.
%

category: 'Tests - Or/And'
method: DefaultsAndAttrsTestCase
testAndPassThrough
	"`1 and 'second'` → 'second' (all truthy, return last)."
	self assert: (testModule @env1:and_pass_through) equals: 'second'.
%

category: 'Tests - Or/And'
method: DefaultsAndAttrsTestCase
testAndChain
	"`1 and 2 and 3` → 3."
	self assert: (testModule @env1:and_chain) equals: 3.
%

! ===============================================================================
! Tests - Array iteration (range slice)
! ===============================================================================

category: 'Tests - Array Iter'
method: DefaultsAndAttrsTestCase
testReversedRangeIteration
	"`for i in range(5)[::-1]: total += i` — range[::-1] returns a
	plain Array (Interval's species is Array), and Array must be
	iterable without DNU."
	self assert: (testModule @env1:reversed_range_sum) equals: 10.
%

! ===============================================================================
! Tests - Chained assignment
! ===============================================================================

category: 'Tests - Chained Assign'
method: DefaultsAndAttrsTestCase
testChainedAssignNames
	"`a = b = c = 42` binds the same value to every target.  Used in
	re._parser.SubPattern.getwidth as `lo = hi = 0`."
	self assert: (testModule @env1:chain_a) equals: 42.
	self assert: (testModule @env1:chain_b) equals: 42.
	self assert: (testModule @env1:chain_c) equals: 42.
%

category: 'Tests - Chained Assign'
method: DefaultsAndAttrsTestCase
testChainedAssignAttrAndName
	"Mixed-target chain: attribute store + name binding share the value."
	self assert: (testModule @env1:chain_d) equals: 99.
	self assert: (testModule @env1:_chain_box) @env1:x equals: 99.
%

! ===============================================================================
! Tests - min/max 2-arg fast path
! ===============================================================================

category: 'Tests - MinMax'
method: DefaultsAndAttrsTestCase
testMinTwoArgs
	"`min(a, b)` returns the smaller value."
	self assert: (testModule @env1:min_pair) equals: 3.
%

category: 'Tests - MinMax'
method: DefaultsAndAttrsTestCase
testMaxTwoArgs
	"`max(a, b)` returns the larger value."
	self assert: (testModule @env1:max_pair) equals: 7.
%

! ===============================================================================
! Tests - DNU varargs fallback
! ===============================================================================

category: 'Tests - DNU Varargs'
method: DefaultsAndAttrsTestCase
testDnuVarargsFallbackTwoArgs
	"`fn(1, 2)` where `fn` is a function with defaults — the call site
	can only emit a positional selector (`name:_:`), and the receiver
	class only has the varargs form (`_name:kw:`).  Object env-1 DNU
	must bridge by dispatching `_name:kw:` with positional+nil."
	self assert: (testModule @env1:varargs_dnu_two) equals: 103.
%

category: 'Tests - DNU Varargs'
method: DefaultsAndAttrsTestCase
testDnuVarargsFallbackThreeArgs
	"Same, with 3 positional args."
	self assert: (testModule @env1:varargs_dnu_three) equals: 6.
%
