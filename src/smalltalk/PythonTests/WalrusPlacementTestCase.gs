! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'WalrusPlacementTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WalrusPlacementTestCase comment:
'PEP 572: where ``:='' may and may not appear.

CPython''s grammar admits the walrus only where the production is
``namedexpr_test'', which is why ``x := 0'' is a SyntaxError while
``(x := 0)'' is fine.  Grail accepted NINE of the ten placements CPython
rejects: a bare statement, the right-hand side of ``='', a keyword
argument value, a parameter default, an annotation, a tuple target.

Unlike the async and parameter placement rules -- both checked by walking
the AST after parsing -- this one CANNOT be: ``x := 0'' and ``(x := 0)''
produce the SAME tree, and the difference is a parenthesis only the
parser sees.  So the gate is parser state: PythonParser >>
___withWalrus___:do: with an instVar defaulting to FORBIDDEN, permitted
explicitly at each site the grammar allows.

That direction was chosen deliberately and earned itself four times.  A
site left out refuses valid code LOUDLY, in a named test; the opposite
default would accept invalid code silently, and could not tell the two
spellings apart in any case.  The four misses, each found by a failing
test rather than by reading:

  * a POSITIONAL call argument (``f(y := 5)''), one of the shapes PEP 572
    exists for -- and forbidding it also cost CPython''s specific
    ``positional argument follows keyword argument'' message;
  * a SUBSCRIPT (``a[b := 0]''), which stopped test_named_expressions
    importing at all;
  * an ELIF condition, which Django writes (``elif query_string :=
    extra.pop(...)'') and which took four Django tests down;
  * a DECORATOR (``@x := y''), legal since PEP 614.

Took test.test_named_expressions 21 -> 12.  What remains there is a
codegen gap (a walrus inside a list display emits invalid Smalltalk),
comprehension-scope binding, and two error-message shapes -- all recorded
in docs/Issues.md.

See tests/python/walrus_placement.py (33 checks, CPython-validated
first).'
%

expectvalue /Class
doit
WalrusPlacementTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
WalrusPlacementTestCase removeAllMethods: 0.
WalrusPlacementTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: WalrusPlacementTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'walrus_placement' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/walrus_placement.py')
		name: 'walrus_placement'.
%

category: 'Grail-Helpers'
method: WalrusPlacementTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: WalrusPlacementTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: WalrusPlacementTestCase
testTheRefusedPlacements
	"Bare statement, assignment right-hand side, keyword-argument value,
	parameter default and annotation -- and the two that get CPython's own
	wording: a tuple TARGET, and the ordering complaint for a walrus that
	is legal where it stands but follows a keyword."

	self assertAll: #('bare_statement' 'bare_statement_call'
		'right_hand_side_of_assignment' 'right_hand_side_with_call'
		'keyword_argument_value' 'keyword_argument_call'
		'parameter_default' 'parameter_annotation' 'tuple_target'
		'positional_after_keyword')
%

category: 'Grail-Tests'
method: WalrusPlacementTestCase
testTheFourSitesThatWereMissed
	"Each of these was refused by a first cut of the gate and found by a
	failing test -- three of them in real code.  They are the reason the
	permitted list is pinned rather than trusted."

	self assertAll: #('positional_call_argument' 'nested_call_argument'
		'genexp_argument' 'subscript' 'elif_condition' 'decorator')
%

category: 'Grail-Tests'
method: WalrusPlacementTestCase
testThePermittedPlacements
	"Every other site the grammar allows: conditions, comprehensions,
	displays, and the expression positions -- plus the parenthesised form
	reaching even the positions refused above."

	self assertAll: #('parenthesised_statement' 'if_condition'
		'if_condition_bare' 'while_condition' 'comprehension_element'
		'comprehension_condition' 'list_display' 'dict_value'
		'set_element' 'assert_statement' 'return_value' 'ternary_arm'
		'lambda_body' 'fstring' 'parenthesised_in_parameter_default'
		'parenthesised_in_keyword_value')
%

category: 'Grail-Tests'
method: WalrusPlacementTestCase
testItStillBinds
	"A placement gate that broke the binding would be worse than no gate."

	self assertAll: #('the_binding_still_happens')
%
