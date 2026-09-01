! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'WalrusInDisplayTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WalrusInDisplayTestCase comment:
'PEP 572: a walrus inside a display, which is an EXPRESSION position.

``[y := spam(x), x / y]'' is ordinary Python -- the shape PEP 572''s own
examples use -- and Grail parsed it, gated it correctly, and then emitted
Smalltalk that would not compile.

Grail builds every list, tuple, set and subscript display as a BRACE
ARRAY, ``{a. b. c}'', and a brace array holds EXPRESSIONS.  Smalltalk''s
assignment is a statement, so the emitted ``{y := spam(x). ...}'' was
rejected with ``unexpected token'' -- a CompileError rather than a
SyntaxError, so it took the whole enclosing method down and Python code
could not catch it.  NamedExprAst >> printSmalltalkOn: now parenthesises
what it emits: ``{(y := spam(x)). ...}'' is accepted, and an assignment''s
value in Smalltalk is what it assigned, so the walrus keeps its value
wherever it stands.  The module- and class-scope branches emit a keyword
send rather than an assignment and needed the same wrapping, for the
same reason -- unparenthesised, the send absorbs whatever follows it.

WHY THE SIBLING FIXTURE DID NOT CATCH THIS.  walrus_placement.py asks
``does this compile?'' through the ``compile'' builtin, and Grail''s
``compile'' stops after PARSING.  Its ``list_display'' check therefore
passed from the day it was written, while the same source failed the
moment anything ran it.  Every check here executes, and looks at both
the resulting value and what the target was bound to.

Took test.test_named_expressions 12 -> 8: assignment_05 (a tuple
display), assignment_12 and scope_04 (a list display inside a
comprehension) and assignment_18 (a two-index subscript).

See tests/python/walrus_in_display.py (16 checks, CPython-validated
first).'
%

expectvalue /Class
doit
WalrusInDisplayTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
WalrusInDisplayTestCase removeAllMethods: 0.
WalrusInDisplayTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: WalrusInDisplayTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'walrus_in_display' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/walrus_in_display.py')
		name: 'walrus_in_display'.
%

category: 'Grail-Helpers'
method: WalrusInDisplayTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: WalrusInDisplayTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: WalrusInDisplayTestCase
testTheFourDisplayKinds
	"List, tuple, set and dict -- every one of them a brace array, and
	every one of them refusing to compile before the parentheses."

	self assertAll: #('list_display' 'tuple_display' 'set_display'
		'dict_display')
%

category: 'Grail-Tests'
method: WalrusInDisplayTestCase
testTheDisplaysWithoutBrackets
	"A subscript with more than one index IS a tuple display
	(``a[b := 0, c := 0]''), and so are the bounds of a slice -- neither
	of them looks like one in the source."

	self assertAll: #('subscript_tuple' 'slice_bounds')
%

category: 'Grail-Tests'
method: WalrusInDisplayTestCase
testDisplaysInsideDisplays
	"Nested, starred, and the comprehension form PEP 572 was written for:
	``[[y := spam(x), x / y] for x in range(1, 5)]'', which is CPython's
	own test_named_expressions assignment_12."

	self assertAll: #('nested_displays' 'starred_display'
		'comprehension_element' 'display_of_displays')
%

category: 'Grail-Tests'
method: WalrusInDisplayTestCase
testTheTargetReachesEveryScope
	"The bare-temp branch is only one of the three the emit can take: a
	module-level or ``global'' target becomes a dynamicInstVar store and a
	class body a definitional store, both KEYWORD SENDS rather than
	assignments.  Those parse inside a brace array unparenthesised, but
	not as the receiver of anything that follows, so they are wrapped too
	-- and pinned here."

	self assertAll: #('module_scope' 'class_body_scope' 'global_target'
		'nonlocal_target')
%

category: 'Grail-Tests'
method: WalrusInDisplayTestCase
testTheWalrusKeepsItsValue
	"Parenthesising must not cost the walrus its value: ``[(z := 5) + 1,
	z]'' is ``[6, 5]'', because a Smalltalk assignment evaluates to what
	it assigned."

	self assertAll: #('walrus_has_a_value' 'display_as_an_argument')
%
